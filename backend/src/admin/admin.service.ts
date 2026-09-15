import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { AuditService } from '../libs/audit/audit.service';
import { EmailService } from '../libs/email/email.service';
import { ListUsersDto } from './dto/list-users.dto';
import { ListBusinessesDto } from './dto/list-businesses.dto';
import { VerifyBusinessDto } from './dto/verify-business.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
  ) {}

  // ─── Dashboard ──────────────────────────────────────────────

  async getDashboardMetrics() {
    const cached = await this.cache.get(CacheService.dashboardKey());
    if (cached) return cached;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [bookingsToday, revenueResult, activeBusinesses, pendingVerifications, totalUsers] =
      await Promise.all([
        this.prisma.booking.count({
          where: { createdAt: { gte: startOfDay(now), lte: endOfDay(now) } },
        }),
        this.prisma.payment.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: monthStart, lte: endOfDay(now) },
          },
          _sum: { amount: true },
        }),
        this.prisma.business.count({
          where: { isActive: true, isVerified: true },
        }),
        this.prisma.business.count({
          where: { verificationStatus: 'PENDING' },
        }),
        this.prisma.user.count({
          where: { isActive: true },
        }),
      ]);

    const metrics = {
      bookingsToday,
      revenueMTD: revenueResult._sum.amount || 0,
      activeBusinesses,
      pendingVerifications,
      totalUsers,
    };

    await this.cache.set(CacheService.dashboardKey(), metrics, 60);
    return metrics;
  }

  // ─── User Management ────────────────────────────────────────

  async listUsers(dto: ListUsersDto) {
    const { role, q, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = dto;

    const where: any = {};
    if (role) where.role = role;
    if (q) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { customer: { firstName: { contains: q, mode: 'insensitive' } } },
        { customer: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          customer: {
            include: {
              _count: { select: { vehicles: true, bookings: true } },
            },
          },
          business: {
            include: {
              _count: { select: { services: true, bookings: true } },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => this.formatUser(u)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            vehicles: true,
            bookings: { orderBy: { createdAt: 'desc' }, take: 10 },
            _count: { select: { reviews: true, favorites: true } },
          },
        },
        business: {
          include: {
            services: true,
            _count: { select: { bookings: true, reviews: true } },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return { data: this.formatUserDetail(user) };
  }

  async activateUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isActive) throw new ConflictException('User is already active');

    await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    return { data: { id, isActive: true, message: 'User activated successfully' } };
  }

  async deactivateUser(id: string, reason?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { customer: true, business: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.isActive) throw new ConflictException('User is already inactive');

    let bookingsCancelled = 0;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          isActive: false,
          tokenVersion: { increment: 1 },
        },
      });

      await tx.refreshToken.deleteMany({ where: { userId: id } });

      if (user.customer) {
        const result = await tx.booking.updateMany({
          where: {
            customerId: user.customer.id,
            status: { in: ['PENDING', 'CONFIRMED'] },
            date: { gte: new Date() },
          },
          data: {
            status: 'CANCELLED',
            cancelReason: reason || 'Account deactivated by admin',
            cancelledBy: 'ADMIN',
          },
        });
        bookingsCancelled = result.count;
      }

      if (user.business) {
        await tx.business.update({
          where: { id: user.business.id },
          data: { isActive: false },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: id,
          action: 'USER_DEACTIVATED',
          entityType: 'USER',
          entityId: id,
          metadata: { reason, bookingsCancelled },
        },
      });
    });

    await this.email.send({
      to: user.email,
      subject: 'Account Deactivated',
      html: `<p>Your account has been deactivated. Reason: ${reason || 'No reason provided'}</p>`,
    });

    return {
      data: {
        id,
        isActive: false,
        sessionsRevoked: true,
        bookingsCancelled,
        message: 'User deactivated successfully',
      },
    };
  }

  // ─── Business Management ────────────────────────────────────

  async listBusinesses(dto: ListBusinessesDto) {
    const { status, isActive, q, page = 1, limit = 20 } = dto;

    const where: any = {};
    if (status) where.verificationStatus = status;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { owner: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [businesses, total] = await Promise.all([
      this.prisma.business.findMany({
        where,
        include: {
          owner: { select: { id: true, email: true } },
          _count: { select: { services: true, bookings: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.business.count({ where }),
    ]);

    return {
      data: businesses,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBusinessDetail(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, email: true } },
        services: true,
        _count: { select: { bookings: true, reviews: true } },
      },
    });

    if (!business) throw new NotFoundException('Business not found');

    const revenueResult = await this.prisma.payment.aggregate({
      where: {
        booking: { businessId: id },
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    });

    return {
      data: {
        ...business,
        totalRevenue: revenueResult._sum.amount || 0,
      },
    };
  }

  async verifyBusiness(id: string, dto: VerifyBusinessDto, adminId: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');
    if (business.verificationStatus !== 'PENDING') {
      throw new ConflictException('Business is not pending verification');
    }

    const updateData: any = {
      verificationStatus: dto.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      verifiedAt: new Date(),
      verifiedBy: adminId,
    };

    if (dto.action === 'APPROVE') {
      updateData.isVerified = true;
    } else {
      updateData.rejectionReason = dto.reason;
    }

    await this.prisma.business.update({ where: { id }, data: updateData });

    await this.audit.write({
      actorId: adminId,
      action: dto.action === 'APPROVE' ? 'BUSINESS_APPROVED' : 'BUSINESS_REJECTED',
      entityType: 'BUSINESS',
      entityId: id,
      metadata: { reason: dto.reason },
    });

    await this.cache.del(`business:${id}`);
    await this.cache.invalidate('search:*');

    await this.email.send({
      to: business.email,
      subject: `Business ${dto.action === 'APPROVE' ? 'Approved' : 'Rejected'}`,
      html: `<p>Your business "${business.name}" has been ${dto.action === 'APPROVE' ? 'approved' : 'rejected'}.${dto.reason ? ` Reason: ${dto.reason}` : ''}</p>`,
    });

    return { data: { id, verificationStatus: updateData.verificationStatus } };
  }

  async deactivateBusiness(id: string, reason?: string, adminId?: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');

    await this.prisma.business.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.write({
      actorId: adminId || 'system',
      action: 'BUSINESS_DEACTIVATED',
      entityType: 'BUSINESS',
      entityId: id,
      metadata: { reason },
    });

    await this.cache.del(`business:${id}`);
    await this.cache.invalidate('search:*');

    return { data: { id, isActive: false, message: 'Business deactivated' } };
  }

  // ─── Formatters ─────────────────────────────────────────────

  private formatUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      customer: user.customer
        ? {
            firstName: user.customer.firstName,
            lastName: user.customer.lastName,
            phone: user.customer.phone,
            vehicleCount: user.customer._count.vehicles,
            bookingCount: user.customer._count.bookings,
          }
        : null,
      business: user.business
        ? {
            name: user.business.name,
            serviceCount: user.business._count.services,
            bookingCount: user.business._count.bookings,
          }
        : null,
    };
  }

  private formatUserDetail(user: any) {
    const base = this.formatUser(user);
    return {
      ...base,
      customer: user.customer
        ? {
            ...base.customer,
            vehicles: user.customer.vehicles,
            recentBookings: user.customer.bookings,
            reviewCount: user.customer._count.reviews,
            favoriteCount: user.customer._count.favorites,
          }
        : null,
      business: user.business
        ? {
            ...base.business,
            services: user.business.services,
            reviewCount: user.business._count.reviews,
          }
        : null,
    };
  }
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
