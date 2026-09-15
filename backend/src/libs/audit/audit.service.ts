import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(data: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, any>;
  }) {
    await this.prisma.auditLog.create({
      data: {
        actorId: data.actorId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.metadata || {},
      },
    });
  }
}
