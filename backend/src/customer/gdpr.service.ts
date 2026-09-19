import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { AuditService } from '../libs/audit/audit.service';
import { EmailService } from '../libs/email/email.service';
import { R2Service } from '../libs/r2/r2.service';
import { CacheService } from '../libs/cache/cache.service';
import * as crypto from 'crypto';

const ANONYMIZATION_PREFIX = 'anonymized_';
const TAX_RETENTION_YEARS = 7;
const TOKEN_CLEANUP_DAYS = 30;
const VERIFICATION_TOKEN_CLEANUP_DAYS = 7;
const GDPR_REQUEST_CLEANUP_DAYS = 30;

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly r2: R2Service,
    private readonly cache: CacheService,
  ) {}

  /**
   * GDPR Export: Request a JSON dump of all personal data.
   * Returns the request ID; the export is processed async.
   */
  async requestExport(userId: string): Promise<{ requestId: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customer: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.customer) throw new ConflictException('No customer profile found');

    const existing = await this.prisma.gdprRequest.findFirst({
      where: {
        userId,
        type: 'DATA_EXPORT',
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });
    if (existing) {
      throw new ConflictException('A data export request is already in progress');
    }

    const request = await this.prisma.gdprRequest.create({
      data: {
        userId,
        type: 'DATA_EXPORT',
        status: 'PENDING',
      },
    });

    await this.audit.write({
      actorId: userId,
      action: 'GDPR_EXPORT_REQUESTED',
      entityType: 'USER',
      entityId: userId,
      metadata: { requestId: request.id },
    });

    this.processExport(request.id).catch((err) =>
      this.logger.error(`Export processing failed for ${request.id}: ${err?.message}`, err?.stack),
    );

    return { requestId: request.id };
  }

  /**
   * Process an export request: gather all user data, generate JSON, upload to R2.
   */
  async processExport(requestId: string): Promise<void> {
    const request = await this.prisma.gdprRequest.findUnique({ where: { id: requestId } });
    if (!request || request.type !== 'DATA_EXPORT') return;

    await this.prisma.gdprRequest.update({
      where: { id: requestId },
      data: { status: 'PROCESSING' },
    });

    try {
      const data = await this.getExportData(request.userId);
      const json = JSON.stringify(data, null, 2);
      const key = `gdpr/exports/${request.userId}/${requestId}.json`;

      const fileUrl = await this.r2.upload(key, json, 'application/json');

      await this.prisma.gdprRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          fileUrl,
          completedAt: new Date(),
        },
      });

      await this.audit.write({
        actorId: request.userId,
        action: 'GDPR_EXPORT_COMPLETED',
        entityType: 'USER',
        entityId: request.userId,
        metadata: { requestId, fileUrl },
      });

      this.logger.log(`GDPR export completed for user ${request.userId}`);
    } catch (err: any) {
      await this.prisma.gdprRequest.update({
        where: { id: requestId },
        data: {
          status: 'FAILED',
          error: err?.message ?? 'Unknown error',
        },
      });
      this.logger.error(`GDPR export failed for ${requestId}: ${err?.message}`, err?.stack);
    }
  }

  /**
   * Gather all personal data for a user as a structured object.
   */
  async getExportData(userId: string): Promise<Record<string, any>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customer: {
          include: {
            vehicles: true,
            bookings: {
              include: {
                service: true,
                business: { select: { id: true, name: true } },
                payment: true,
                review: true,
              },
              orderBy: { createdAt: 'desc' },
            },
            reviews: {
              include: {
                business: { select: { id: true, name: true } },
              },
            },
            favorites: {
              include: {
                business: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        emailVerified: user.emailVerified,
      },
      customer: user.customer
        ? {
            firstName: user.customer.firstName,
            lastName: user.customer.lastName,
            phone: user.customer.phone,
            defaultVehicle: user.customer.defaultVehicle,
            createdAt: user.customer.createdAt,
          }
        : null,
      vehicles: user.customer?.vehicles ?? [],
      bookings: user.customer?.bookings ?? [],
      reviews: user.customer?.reviews ?? [],
      favorites: user.customer?.favorites ?? [],
    };
  }

  /**
   * GDPR Erasure: Anonymize all personal data for a user.
   * Preserves financial records (Booking, Payment) per tax retention (7y).
   */
  async anonymizeAccount(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customer: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.customer) throw new ConflictException('No customer profile found');

    const existing = await this.prisma.gdprRequest.findFirst({
      where: {
        userId,
        type: 'ACCOUNT_DELETION',
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });
    if (existing) {
      throw new ConflictException('An account deletion request is already in progress');
    }

    const anonymizedEmail = this.hashEmail(user.email);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // 1. Anonymize User PII
      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          phone: null,
          avatar: null,
          isActive: false,
          tokenVersion: { increment: 1 },
          passwordHash: crypto.randomBytes(32).toString('hex'),
        },
      });

      // 2. Anonymize Customer PII
      await tx.customer.update({
        where: { userId },
        data: {
          firstName: ANONYMIZATION_PREFIX,
          lastName: ANONYMIZATION_PREFIX,
          phone: null,
          defaultVehicle: null,
        },
      });

      // 3. Anonymize Vehicle license plates
      const customerId = user.customer!.id;
      await tx.vehicle.updateMany({
        where: { customerId },
        data: {
          licensePlate: ANONYMIZATION_PREFIX,
          color: null,
        },
      });

      // 4. Anonymize Review comments
      await tx.review.updateMany({
        where: { customerId },
        data: {
          comment: 'This review has been deleted per GDPR request.',
        },
      });

      // 5. Delete all auth tokens (sessions invalidated)
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.verificationToken.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });

      // 6. Delete all notifications
      await tx.notification.deleteMany({ where: { userId } });

      // 7. Delete all favorites
      await tx.favorite.deleteMany({ where: { customerId } });

      // 8. Delete idempotency keys
      await tx.idempotencyKey.deleteMany({ where: { userId } });

      // 9. Log the anonymization in audit trail
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'GDPR_ACCOUNT_ANONYMIZED',
          entityType: 'USER',
          entityId: userId,
          metadata: {
            anonymizedEmail,
            retainedModels: ['Booking', 'Payment', 'AuditLog'],
            taxRetentionYears: TAX_RETENTION_YEARS,
          },
        },
      });

      // 10. Create GDPR request record
      await tx.gdprRequest.create({
        data: {
          userId,
          type: 'ACCOUNT_DELETION',
          status: 'COMPLETED',
          completedAt: now,
        },
      });
    });

    // Invalidate caches
    await this.cache.del(`user:${userId}`);
    await this.cache.del(`customer:${userId}`);
    await this.cache.invalidate('search:*');

    // Send confirmation email (to the original email before anonymization)
    await this.email.send({
      to: user.email,
      subject: 'Account Deleted - GDPR Request',
      html: `<p>Your account has been anonymized per your GDPR deletion request.</p>
             <p>Personal data has been removed. Financial records are retained for ${TAX_RETENTION_YEARS} years per tax regulations.</p>
             <p>This action cannot be undone.</p>`,
    });

    await this.audit.write({
      actorId: userId,
      action: 'GDPR_ACCOUNT_ANONYMIZED',
      entityType: 'USER',
      entityId: userId,
      metadata: { anonymizedEmail },
    });

    return { message: 'Account anonymized successfully. Financial records retained per tax regulations.' };
  }

  /**
   * Data retention: clean up expired tokens and old GDPR requests.
   * Called by cron daily.
   */
  async cleanupExpiredTokens(): Promise<{ deleted: number }> {
    const now = new Date();

    const safeDelete = (promise: Promise<{ count: number }>): Promise<{ count: number }> =>
      promise.catch((err) => {
        this.logger.warn(`Cleanup skip: ${err.message?.slice(0, 120)}`);
        return { count: 0 };
      });

    const [refreshTokens, verificationTokens, passwordResetTokens, gdprRequests] =
      await Promise.all([
        safeDelete(
          this.prisma.refreshToken.deleteMany({
            where: { expiresAt: { lt: now } },
          }),
        ),
        safeDelete(
          this.prisma.verificationToken.deleteMany({
            where: {
              expiresAt: { lt: now },
              OR: [{ usedAt: { not: null } }, { createdAt: { lt: subDays(now, VERIFICATION_TOKEN_CLEANUP_DAYS) } }],
            },
          }),
        ),
        safeDelete(
          this.prisma.passwordResetToken.deleteMany({
            where: {
              expiresAt: { lt: now },
              OR: [{ usedAt: { not: null } }, { createdAt: { lt: subDays(now, VERIFICATION_TOKEN_CLEANUP_DAYS) } }],
            },
          }),
        ),
        safeDelete(
          this.prisma.gdprRequest.deleteMany({
            where: {
              createdAt: { lt: subDays(now, GDPR_REQUEST_CLEANUP_DAYS) },
              status: { in: ['COMPLETED', 'FAILED'] },
            },
          }),
        ),
      ]);

    const total =
      refreshTokens.count + verificationTokens.count + passwordResetTokens.count + gdprRequests.count;

    if (total > 0) {
      this.logger.log(
        `Data retention cleanup: ${refreshTokens.count} refresh tokens, ` +
          `${verificationTokens.count} verification tokens, ` +
          `${passwordResetTokens.count} password reset tokens, ` +
          `${gdprRequests.count} GDPR requests deleted`,
      );
    }

    return { deleted: total };
  }

  /**
   * Hash email with SHA-256 for anonymization.
   * Produces a deterministic hash so the same email always maps to the same anonymized value.
   */
  private hashEmail(email: string): string {
    const hash = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
    return `${ANONYMIZATION_PREFIX}${hash.slice(0, 16)}`;
  }
}

function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}
