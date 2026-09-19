import { GdprService } from './gdpr.service';

function mockPrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      update: jest.fn(),
    },
    vehicle: {
      updateMany: jest.fn(),
    },
    review: {
      updateMany: jest.fn(),
    },
    refreshToken: {
      deleteMany: jest.fn(),
    },
    verificationToken: {
      deleteMany: jest.fn(),
    },
    passwordResetToken: {
      deleteMany: jest.fn(),
    },
    notification: {
      deleteMany: jest.fn(),
    },
    favorite: {
      deleteMany: jest.fn(),
    },
    idempotencyKey: {
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    gdprRequest: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((fns: any[]) => {
      if (Array.isArray(fns)) {
        return Promise.all(fns.map((fn) => fn));
      }
      return fns;
    }),
  };
}

function mockAudit() {
  return { write: jest.fn() };
}

function mockEmail() {
  return { send: jest.fn() };
}

function mockR2() {
  return { upload: jest.fn() };
}

function mockCache() {
  return { get: jest.fn(), set: jest.fn(), del: jest.fn(), invalidate: jest.fn() };
}

function makeService(overrides: Record<string, any> = {}) {
  const prisma = mockPrisma();
  const audit = mockAudit();
  const email = mockEmail();
  const r2 = mockR2();
  const cache = mockCache();

  const service = new GdprService(prisma as any, audit as any, email as any, r2 as any, cache as any);

  return { service, prisma, audit, email, r2, cache, ...overrides };
}

const USER_ID = 'user-1';
const CUSTOMER_ID = 'cust-1';
const REQUEST_ID = 'req-1';

const SAMPLE_USER = {
  id: USER_ID,
  email: 'test@example.com',
  role: 'CUSTOMER',
  phone: '+233240000000',
  avatar: 'https://example.com/avatar.jpg',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  lastLoginAt: new Date('2024-06-15'),
  emailVerified: new Date('2024-01-02'),
  customer: {
    id: CUSTOMER_ID,
    firstName: 'John',
    lastName: 'Doe',
    phone: '+233240000001',
    defaultVehicle: 'Toyota Camry',
    createdAt: new Date('2024-01-01'),
  },
};

describe('GdprService', () => {
  describe('requestExport', () => {
    it('should create export request and return request ID', async () => {
      const { service, prisma, audit } = makeService();
      prisma.user.findUnique.mockResolvedValue(SAMPLE_USER);
      prisma.gdprRequest.findFirst.mockResolvedValue(null);
      prisma.gdprRequest.create.mockResolvedValue({ id: REQUEST_ID, userId: USER_ID, type: 'DATA_EXPORT', status: 'PENDING' });

      const result = await service.requestExport(USER_ID);

      expect(result.requestId).toBe(REQUEST_ID);
      expect(prisma.gdprRequest.create).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          type: 'DATA_EXPORT',
          status: 'PENDING',
        },
      });
      expect(audit.write).toHaveBeenCalledWith({
        actorId: USER_ID,
        action: 'GDPR_EXPORT_REQUESTED',
        entityType: 'USER',
        entityId: USER_ID,
        metadata: { requestId: REQUEST_ID },
      });
    });

    it('should throw NotFoundException for unknown user', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.requestExport(USER_ID)).rejects.toThrow('User not found');
    });

    it('should throw ConflictException if user has no customer profile', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue({ ...SAMPLE_USER, customer: null });

      await expect(service.requestExport(USER_ID)).rejects.toThrow('No customer profile found');
    });

    it('should throw ConflictException if export already in progress', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue(SAMPLE_USER);
      prisma.gdprRequest.findFirst.mockResolvedValue({ id: 'existing-req', status: 'PENDING' });

      await expect(service.requestExport(USER_ID)).rejects.toThrow('A data export request is already in progress');
    });
  });

  describe('processExport', () => {
    it('should gather data and upload to R2', async () => {
      const { service, prisma, r2, audit } = makeService();
      prisma.gdprRequest.findUnique.mockResolvedValue({ id: REQUEST_ID, userId: USER_ID, type: 'DATA_EXPORT' });
      prisma.user.findUnique.mockResolvedValue(SAMPLE_USER);
      r2.upload.mockResolvedValue('https://r2.example.com/export.json');

      await service.processExport(REQUEST_ID);

      expect(r2.upload).toHaveBeenCalledWith(
        `gdpr/exports/${USER_ID}/${REQUEST_ID}.json`,
        expect.any(String),
        'application/json',
      );
      expect(prisma.gdprRequest.update).toHaveBeenCalledWith({
        where: { id: REQUEST_ID },
        data: {
          status: 'COMPLETED',
          fileUrl: 'https://r2.example.com/export.json',
          completedAt: expect.any(Date),
        },
      });
      expect(audit.write).toHaveBeenCalledWith({
        actorId: USER_ID,
        action: 'GDPR_EXPORT_COMPLETED',
        entityType: 'USER',
        entityId: USER_ID,
        metadata: { requestId: REQUEST_ID, fileUrl: 'https://r2.example.com/export.json' },
      });
    });

    it('should mark request as FAILED on error', async () => {
      const { service, prisma, r2 } = makeService();
      prisma.gdprRequest.findUnique.mockResolvedValue({ id: REQUEST_ID, userId: USER_ID, type: 'DATA_EXPORT' });
      prisma.user.findUnique.mockResolvedValue(SAMPLE_USER);
      r2.upload.mockRejectedValue(new Error('R2 upload failed'));

      await service.processExport(REQUEST_ID);

      expect(prisma.gdprRequest.update).toHaveBeenCalledWith({
        where: { id: REQUEST_ID },
        data: {
          status: 'FAILED',
          error: 'R2 upload failed',
        },
      });
    });

    it('should skip if request not found', async () => {
      const { service, prisma } = makeService();
      prisma.gdprRequest.findUnique.mockResolvedValue(null);

      await service.processExport(REQUEST_ID);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should skip if request type is not DATA_EXPORT', async () => {
      const { service, prisma } = makeService();
      prisma.gdprRequest.findUnique.mockResolvedValue({ id: REQUEST_ID, userId: USER_ID, type: 'ACCOUNT_DELETION' });

      await service.processExport(REQUEST_ID);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getExportData', () => {
    it('should return structured user data', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue({
        ...SAMPLE_USER,
        customer: {
          ...SAMPLE_USER.customer,
          vehicles: [{ id: 'v1', make: 'Toyota', model: 'Camry', licensePlate: 'ABC-123' }],
          bookings: [{ id: 'b1', status: 'COMPLETED', totalPrice: 50 }],
          reviews: [{ id: 'r1', rating: 5, comment: 'Great!' }],
          favorites: [{ id: 'f1', businessId: 'biz1' }],
        },
      });

      const data = await service.getExportData(USER_ID);

      expect(data.user.email).toBe('test@example.com');
      expect(data.user.phone).toBe('+233240000000');
      expect(data.customer.firstName).toBe('John');
      expect(data.customer.lastName).toBe('Doe');
      expect(data.vehicles).toHaveLength(1);
      expect(data.bookings).toHaveLength(1);
      expect(data.reviews).toHaveLength(1);
      expect(data.favorites).toHaveLength(1);
    });

    it('should throw NotFoundException for unknown user', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getExportData(USER_ID)).rejects.toThrow('User not found');
    });
  });

  describe('anonymizeAccount', () => {
    it('should anonymize all PII in a transaction', async () => {
      const { service, prisma, cache, email, audit } = makeService();
      prisma.user.findUnique.mockResolvedValue(SAMPLE_USER);
      prisma.gdprRequest.findFirst.mockResolvedValue(null);

      const txMocks = {
        user: { update: jest.fn() },
        customer: { update: jest.fn() },
        vehicle: { updateMany: jest.fn() },
        review: { updateMany: jest.fn() },
        refreshToken: { deleteMany: jest.fn() },
        verificationToken: { deleteMany: jest.fn() },
        passwordResetToken: { deleteMany: jest.fn() },
        notification: { deleteMany: jest.fn() },
        favorite: { deleteMany: jest.fn() },
        idempotencyKey: { deleteMany: jest.fn() },
        auditLog: { create: jest.fn() },
        gdprRequest: { create: jest.fn() },
      };

      prisma.$transaction.mockImplementation(async (fn: any) => {
        return fn(txMocks);
      });

      const result = await service.anonymizeAccount(USER_ID);

      expect(result.message).toContain('anonymized successfully');
      expect(result.message).toContain('retained');

      // User anonymized
      expect(txMocks.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: {
          email: expect.stringMatching(/^anonymized_/),
          phone: null,
          avatar: null,
          isActive: false,
          tokenVersion: { increment: 1 },
          passwordHash: expect.any(String),
        },
      });

      // Customer anonymized
      expect(txMocks.customer.update).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data: {
          firstName: 'anonymized_',
          lastName: 'anonymized_',
          phone: null,
          defaultVehicle: null,
        },
      });

      // Vehicles anonymized
      expect(txMocks.vehicle.updateMany).toHaveBeenCalledWith({
        where: { customerId: CUSTOMER_ID },
        data: {
          licensePlate: 'anonymized_',
          color: null,
        },
      });

      // Reviews anonymized
      expect(txMocks.review.updateMany).toHaveBeenCalledWith({
        where: { customerId: CUSTOMER_ID },
        data: {
          comment: 'This review has been deleted per GDPR request.',
        },
      });

      // Tokens deleted
      expect(txMocks.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });
      expect(txMocks.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });
      expect(txMocks.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });

      // Notifications deleted
      expect(txMocks.notification.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });

      // Favorites deleted
      expect(txMocks.favorite.deleteMany).toHaveBeenCalledWith({ where: { customerId: CUSTOMER_ID } });

      // Idempotency keys deleted
      expect(txMocks.idempotencyKey.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });

      // GDPR request created
      expect(txMocks.gdprRequest.create).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          type: 'ACCOUNT_DELETION',
          status: 'COMPLETED',
          completedAt: expect.any(Date),
        },
      });

      // Audit logged
      expect(txMocks.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: USER_ID,
          action: 'GDPR_ACCOUNT_ANONYMIZED',
          entityType: 'USER',
          entityId: USER_ID,
          metadata: {
            anonymizedEmail: expect.stringMatching(/^anonymized_/),
            retainedModels: ['Booking', 'Payment', 'AuditLog'],
            taxRetentionYears: 7,
          },
        },
      });

      // Cache invalidated
      expect(cache.del).toHaveBeenCalledWith(`user:${USER_ID}`);
      expect(cache.del).toHaveBeenCalledWith(`customer:${USER_ID}`);
      expect(cache.invalidate).toHaveBeenCalledWith('search:*');

      // Confirmation email sent
      expect(email.send).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Account Deleted - GDPR Request',
        html: expect.stringContaining('anonymized'),
      });
    });

    it('should throw NotFoundException for unknown user', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.anonymizeAccount(USER_ID)).rejects.toThrow('User not found');
    });

    it('should throw ConflictException if user has no customer profile', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue({ ...SAMPLE_USER, customer: null });

      await expect(service.anonymizeAccount(USER_ID)).rejects.toThrow('No customer profile found');
    });

    it('should throw ConflictException if deletion already in progress', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue(SAMPLE_USER);
      prisma.gdprRequest.findFirst.mockResolvedValue({ id: 'existing', status: 'PENDING' });

      await expect(service.anonymizeAccount(USER_ID)).rejects.toThrow('An account deletion request is already in progress');
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens and old GDPR requests', async () => {
      const { service, prisma } = makeService();
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 5 });
      prisma.verificationToken.deleteMany.mockResolvedValue({ count: 3 });
      prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 2 });
      prisma.gdprRequest.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.cleanupExpiredTokens();

      expect(result.deleted).toBe(11);
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
      expect(prisma.verificationToken.deleteMany).toHaveBeenCalled();
      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalled();
      expect(prisma.gdprRequest.deleteMany).toHaveBeenCalled();
    });

    it('should return 0 when nothing to clean', async () => {
      const { service, prisma } = makeService();
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
      prisma.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
      prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      prisma.gdprRequest.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.cleanupExpiredTokens();

      expect(result.deleted).toBe(0);
    });

    it('should gracefully skip cleanup when a table is missing', async () => {
      const { service, prisma } = makeService();
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });
      prisma.verificationToken.deleteMany.mockResolvedValue({ count: 1 });
      prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 1 });
      prisma.gdprRequest.deleteMany.mockRejectedValue(
        new Error('The table `public.GdprRequest` does not exist'),
      );

      const result = await service.cleanupExpiredTokens();

      expect(result.deleted).toBe(4);
    });
  });
});
