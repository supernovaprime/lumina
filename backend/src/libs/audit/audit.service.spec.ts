import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('write', () => {
    it('should create audit log entry', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

      await service.write({
        actorId: 'admin-1',
        action: 'USER_DEACTIVATED',
        entityType: 'USER',
        entityId: 'user-1',
        metadata: { reason: 'Violation' },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 'admin-1',
          action: 'USER_DEACTIVATED',
          entityType: 'USER',
          entityId: 'user-1',
          metadata: { reason: 'Violation' },
        },
      });
    });

    it('should default metadata to empty object', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

      await service.write({
        actorId: 'admin-1',
        action: 'BUSINESS_APPROVED',
        entityType: 'BUSINESS',
        entityId: 'biz-1',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 'admin-1',
          action: 'BUSINESS_APPROVED',
          entityType: 'BUSINESS',
          entityId: 'biz-1',
          metadata: {},
        },
      });
    });
  });
});
