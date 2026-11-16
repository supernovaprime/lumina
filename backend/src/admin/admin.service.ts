import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
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

    // One round trip instead of five simultaneous COUNT/aggregate queries.
    // Supabase's pooler is the bottleneck, so reducing connection pressure
    // matters more than the individual query plans here.
    const rows = await this.prisma.$queryRaw<
      Array<{
        bookingsToday: number;
        revenueMTD: number;
        activeBusinesses: number;
        pendingVerifications: number;
        totalUsers: number;
      }>
    >`
      SELECT
        (SELECT COUNT(*)::int
           FROM "Booking"
          WHERE "createdAt" >= ${startOfDay(now)}
            AND "createdAt" <= ${endOfDay(now)}) AS "bookingsToday",
        (SELECT COALESCE(SUM("amount"), 0)::float8
           FROM "Payment"
          WHERE "status" = 'COMPLETED'
            AND "createdAt" >= ${monthStart}
            AND "createdAt" <= ${endOfDay(now)}) AS "revenueMTD",
        (SELECT COUNT(*)::int
           FROM "Business"
          WHERE "isActive" = true AND "isVerified" = true) AS "activeBusinesses",
        (SELECT COUNT(*)::int
           FROM "Business"
          WHERE "verificationStatus" = 'PENDING') AS "pendingVerifications",
        (SELECT COUNT(*)::int
           FROM "User"
          WHERE "isActive" = true) AS "totalUsers"
    `;

    const row = rows[0];
    const metrics = {
      bookingsToday: Number(row?.bookingsToday ?? 0),
      revenueMTD: Number(row?.revenueMTD ?? 0),
      activeBusinesses: Number(row?.activeBusinesses ?? 0),
      pendingVerifications: Number(row?.pendingVerifications ?? 0),
      totalUsers: Number(row?.totalUsers ?? 0),
    };

    await this.cache.set(CacheService.dashboardKey(), metrics, 60);
    return metrics;
  }

  // ─── User Management ────────────────────────────────────────

  async listUsers(dto: ListUsersDto) {
    const {
      role,
      q,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = dto;
    const term = q?.trim();
    const cacheKey = CacheService.adminUsersKey(
      [role ?? 'all', term ?? '', page, limit, sortBy, sortOrder].join('|'),
    );

    const cached = await this.cache.get<{
      data: any[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (role) where.role = role;
    if (term) {
      where.OR = [
        { email: { contains: term, mode: 'insensitive' } },
        { customer: { firstName: { contains: term, mode: 'insensitive' } } },
        { customer: { lastName: { contains: term, mode: 'insensitive' } } },
        { business: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        relationLoadStrategy: 'join',
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              _count: { select: { vehicles: true, bookings: true } },
            },
          },
          business: {
            select: {
              name: true,
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

    const result = {
      data: users.map((u) => this.formatUser(u)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.cache.set(cacheKey, result, 30);
    return result;
  }

  async getUserDetail(id: string) {
    const cacheKey = CacheService.adminUserKey(id);
    const cached = await this.cache.get<{ data: any }>(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id },
      relationLoadStrategy: 'join',
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            vehicles: {
              select: {
                id: true,
                make: true,
                model: true,
                year: true,
                color: true,
                licensePlate: true,
                type: true,
                size: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            },
            bookings: {
              orderBy: { createdAt: 'desc' },
              take: 10,
              select: {
                id: true,
                date: true,
                timeSlot: true,
                status: true,
                totalPrice: true,
                notes: true,
                createdAt: true,
                service: { select: { name: true } },
                business: { select: { name: true } },
              },
            },
            _count: {
              select: {
                vehicles: true,
                bookings: true,
                reviews: true,
                favorites: true,
              },
            },
          },
        },
        business: {
          select: {
            name: true,
            services: {
              select: {
                id: true,
                name: true,
                category: true,
                basePrice: true,
                durationMinutes: true,
                isActive: true,
              },
              orderBy: { name: 'asc' },
            },
            _count: {
              select: {
                services: true,
                bookings: true,
                reviews: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const result = { data: this.formatUserDetail(user) };
    await this.cache.set(cacheKey, result, 60);
    return result;
  }

  async activateUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.isActive) throw new ConflictException('User is already active');

    await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    await this.invalidateUserCaches(id);

    return {
      data: { id, isActive: true, message: 'User activated successfully' },
    };
  }

  async deactivateUser(id: string, reason?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        isActive: true,
        customer: { select: { id: true } },
        business: { select: { id: true } },
      },
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

    await this.invalidateUserCaches(id, user.business?.id);

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
    const cacheKey = CacheService.adminBusinessesKey(
      [status ?? 'all', isActive ?? 'all', q?.trim() ?? '', page, limit].join(
        '|',
      ),
    );

    const cached = await this.cache.get<{
      data: any[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>(cacheKey);
    if (cached) return cached;

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
        relationLoadStrategy: 'join',
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

    const result = {
      data: businesses,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    await this.cache.set(cacheKey, result, 30);
    return result;
  }

  async getBusinessDetail(id: string) {
    const cacheKey = CacheService.adminBusinessKey(id);
    const cached = await this.cache.get<{ data: any }>(cacheKey);
    if (cached) return cached;

    const business = await this.prisma.business.findUnique({
      where: { id },
      relationLoadStrategy: 'join',
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

    const result = {
      data: {
        ...business,
        totalRevenue: revenueResult._sum.amount || 0,
      },
    };

    await this.cache.set(cacheKey, result, 60);
    return result;
  }

  async verifyBusiness(id: string, dto: VerifyBusinessDto, adminId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        verificationStatus: true,
      },
    });
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
      action:
        dto.action === 'APPROVE' ? 'BUSINESS_APPROVED' : 'BUSINESS_REJECTED',
      entityType: 'BUSINESS',
      entityId: id,
      metadata: { reason: dto.reason },
    });

    await this.cache.del(CacheService.businessKey(id));
    await this.cache.del(CacheService.adminBusinessKey(id));
    await this.cache.del(CacheService.dashboardKey());
    await this.cache.invalidate('admin:businesses:*');
    await this.cache.invalidate('search:*');

    await this.email.send({
      to: business.email,
      subject: `Business ${dto.action === 'APPROVE' ? 'Approved' : 'Rejected'}`,
      html: `<p>Your business "${business.name}" has been ${dto.action === 'APPROVE' ? 'approved' : 'rejected'}.${dto.reason ? ` Reason: ${dto.reason}` : ''}</p>`,
    });

    return { data: { id, verificationStatus: updateData.verificationStatus } };
  }

  async deactivateBusiness(id: string, reason?: string, adminId?: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, isActive: true },
    });
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

    await this.cache.del(CacheService.businessKey(id));
    await this.cache.del(CacheService.adminBusinessKey(id));
    await this.cache.del(CacheService.dashboardKey());
    await this.cache.invalidate('admin:businesses:*');
    await this.cache.invalidate('search:*');

    return { data: { id, isActive: false, message: 'Business deactivated' } };
  }

  // ─── Cache Invalidation ─────────────────────────────────────

  private async invalidateUserCaches(id: string, businessId?: string) {
    const invalidations: Promise<void>[] = [
      this.cache.invalidate('admin:users:*'),
      this.cache.del(CacheService.adminUserKey(id)),
      this.cache.del(CacheService.dashboardKey()),
      this.cache.del(CacheService.authUserKey(id)),
    ];

    if (businessId) {
      invalidations.push(
        this.cache.del(CacheService.businessKey(businessId)),
        this.cache.invalidate('search:*'),
      );
    }

    await Promise.all(invalidations);
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
