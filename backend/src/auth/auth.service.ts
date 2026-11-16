import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../libs/prisma/prisma.service';
import { TokenService } from '../libs/tokens/token.service';
import { RateLimitService } from '../libs/rate-limit/rate-limit.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly tokenService: TokenService,
    private readonly rateLimit: RateLimitService,
    private readonly notificationService: NotificationService,
  ) {}

  async register(dto: {
    email: string;
    password: string;
    role?: 'CUSTOMER' | 'BUSINESS';
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    const role = dto.role ?? 'CUSTOMER';

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Unable to create account');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          role,
          isActive: true,
        },
      });

      if (role === 'CUSTOMER') {
        await tx.customer.create({
          data: {
            userId: newUser.id,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
          },
        });
      }

      return newUser;
    });

    // Create verification token and send email
    const verificationToken = await this.tokenService.createVerificationToken(user.id);
    await this.notificationService.enqueue('email-verification', user.id, {
      token: verificationToken,
      email: user.email,
    });

    return {
      userId: user.id,
      email: user.email,
      requiresVerification: true,
    };
  }

  async login(dto: { email: string; password: string }) {
    const email = dto.email.toLowerCase();

    // Check if account is rate-limited
    const { blocked, retryAfterSeconds } = await this.rateLimit.isBlocked(email);
    if (blocked) {
      throw new HttpException(
        `Too many failed login attempts. Retry after ${retryAfterSeconds} seconds`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        customer: true,
        business: true,
      },
    });

    if (!user || !user.isActive) {
      await this.rateLimit.recordFailedAttempt(email);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      const { blocked: nowBlocked, retryAfterSeconds: retry } = await this.rateLimit.recordFailedAttempt(email);
      if (nowBlocked) {
        throw new HttpException(
          `Too many failed login attempts. Retry after ${retry} seconds`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    // Successful login — reset attempt counter
    await this.rateLimit.resetAttempts(email);

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      customer: user.customer,
      business: user.business,
      accessToken,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customer: true,
        business: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      customer: user.customer,
      business: user.business,
    };
  }

  async forgotPassword(dto: { email: string }) {
    // Always return 200 to prevent email enumeration
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (user && user.isActive) {
      const resetToken = await this.tokenService.createPasswordResetToken(user.id);
      await this.notificationService.enqueue('password-reset', user.id, {
        token: resetToken,
        email: user.email,
      });
    }

    return { message: 'If an account with that email exists, a reset link has been sent' };
  }

  async resetPassword(dto: { token: string; newPassword: string }) {
    const userId = await this.tokenService.consumePasswordResetToken(dto.token);

    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    // Update password and bump tokenVersion to revoke all existing sessions
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    });

    return { message: 'Password reset successful' };
  }

  async verifyEmail(dto: { token: string }) {
    const userId = await this.tokenService.consumeVerificationToken(dto.token);

    if (!userId) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });

    return { message: 'Email verified successfully' };
  }

  async updateProfile(userId: string, dto: { firstName?: string; lastName?: string; phone?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customer: true, business: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.customer) {
      throw new BadRequestException('Customer profile not found');
    }

    const updateData: Record<string, any> = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;

    if (Object.keys(updateData).length === 0) {
      return this.getProfile(userId);
    }

    const updatedCustomer = await this.prisma.customer.update({
      where: { userId },
      data: updateData,
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      customer: updatedCustomer,
      business: user.business,
    };
  }
}
