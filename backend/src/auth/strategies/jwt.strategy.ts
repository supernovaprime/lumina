import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../libs/prisma/prisma.service';
import { CacheService } from '../../libs/cache/cache.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const cacheKey = CacheService.authUserKey(payload.sub);
    const cached = await this.cache.get<{
      id: string;
      email: string;
      role: string;
      isActive: boolean;
      tokenVersion: number;
    }>(cacheKey);

    if (cached) {
      if (!cached.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }
      return cached;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true, tokenVersion: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const principal = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      tokenVersion: user.tokenVersion,
    };

    await this.cache.set(cacheKey, principal, 30);
    return principal;
  }
}
