import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminBookingService } from './admin-booking.service';
import { AdminReviewService } from './admin-review.service';
import { AdminReportService } from './admin-report.service';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: any;
  let bookingService: any;
  let reviewService: any;
  let reportService: any;

  beforeEach(async () => {
    adminService = {
      getDashboardMetrics: jest.fn().mockResolvedValue({ bookingsToday: 10 }),
      listUsers: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
      getUserDetail: jest.fn().mockResolvedValue({ data: { id: 'u1' } }),
      activateUser: jest.fn().mockResolvedValue({ data: { id: 'u1', isActive: true } }),
      deactivateUser: jest.fn().mockResolvedValue({ data: { id: 'u1', isActive: false } }),
      listBusinesses: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
      getBusinessDetail: jest.fn().mockResolvedValue({ data: { id: 'b1' } }),
      verifyBusiness: jest.fn().mockResolvedValue({ data: { id: 'b1', verificationStatus: 'APPROVED' } }),
      deactivateBusiness: jest.fn().mockResolvedValue({ data: { id: 'b1', isActive: false } }),
    };

    bookingService = {
      listBookings: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
      getBookingDetail: jest.fn().mockResolvedValue({ data: { id: 'bk1' } }),
      cancelBooking: jest.fn().mockResolvedValue({ data: { id: 'bk1', status: 'CANCELLED' } }),
    };

    reviewService = {
      listReviews: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
      hideReview: jest.fn().mockResolvedValue({ data: { id: 'r1', isHidden: true } }),
      unhideReview: jest.fn().mockResolvedValue({ data: { id: 'r1', isHidden: false } }),
    };

    reportService = {
      generateReport: jest.fn().mockResolvedValue({ id: 'job1', status: 'PROCESSING' }),
      getReportStatus: jest.fn().mockResolvedValue({ id: 'job1', status: 'COMPLETED' }),
      getAuditLog: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: adminService },
        { provide: AdminBookingService, useValue: bookingService },
        { provide: AdminReviewService, useValue: reviewService },
        { provide: AdminReportService, useValue: reportService },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getDashboard', () => {
    it('returns dashboard metrics', async () => {
      const result = await controller.getDashboard() as any;
      expect(result.bookingsToday).toBe(10);
      expect(adminService.getDashboardMetrics).toHaveBeenCalled();
    });
  });

  describe('listUsers', () => {
    it('returns paginated users', async () => {
      const result = await controller.listUsers({});
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getUser', () => {
    it('returns user detail', async () => {
      const result = await controller.getUser('123e4567-e89b-12d3-a456-426614174000');
      expect(result.data.id).toBe('u1');
    });
  });

  describe('activateUser', () => {
    it('activates user', async () => {
      const result = await controller.activateUser('123e4567-e89b-12d3-a456-426614174000');
      expect(result.data.isActive).toBe(true);
    });
  });

  describe('deactivateUser', () => {
    it('deactivates user', async () => {
      const result = await controller.deactivateUser('123e4567-e89b-12d3-a456-426614174000', { reason: 'Test' });
      expect(result.data.isActive).toBe(false);
    });
  });

  describe('listBusinesses', () => {
    it('returns paginated businesses', async () => {
      const result = await controller.listBusinesses({});
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getBusiness', () => {
    it('returns business detail', async () => {
      const result = await controller.getBusiness('123e4567-e89b-12d3-a456-426614174000');
      expect(result.data.id).toBe('b1');
    });
  });

  describe('verifyBusiness', () => {
    it('approves business', async () => {
      const result = await controller.verifyBusiness(
        '123e4567-e89b-12d3-a456-426614174000',
        { action: 'APPROVE' },
        'admin1',
      );
      expect(result.data.verificationStatus).toBe('APPROVED');
    });
  });

  describe('deactivateBusiness', () => {
    it('deactivates business', async () => {
      const result = await controller.deactivateBusiness(
        '123e4567-e89b-12d3-a456-426614174000',
        { reason: 'Terms violation' },
        'admin1',
      );
      expect(result.data.isActive).toBe(false);
    });
  });

  describe('listBookings', () => {
    it('returns paginated bookings', async () => {
      const result = await controller.listBookings({});
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getBooking', () => {
    it('returns booking detail', async () => {
      const result = await controller.getBooking('123e4567-e89b-12d3-a456-426614174000');
      expect(result.data.id).toBe('bk1');
    });
  });

  describe('cancelBooking', () => {
    it('cancels booking', async () => {
      const result = await controller.cancelBooking(
        '123e4567-e89b-12d3-a456-426614174000',
        { reason: 'Customer request' },
        'admin1',
      );
      expect(result.data.status).toBe('CANCELLED');
    });
  });

  describe('listReviews', () => {
    it('returns paginated reviews', async () => {
      const result = await controller.listReviews({});
      expect(result.meta.total).toBe(0);
    });
  });

  describe('hideReview', () => {
    it('hides review', async () => {
      const result = await controller.hideReview(
        '123e4567-e89b-12d3-a456-426614174000',
        { reason: 'Inappropriate' },
        'admin1',
      );
      expect(result.data.isHidden).toBe(true);
    });
  });

  describe('unhideReview', () => {
    it('unhides review', async () => {
      const result = await controller.unhideReview(
        '123e4567-e89b-12d3-a456-426614174000',
        'admin1',
      );
      expect(result.data.isHidden).toBe(false);
    });
  });

  describe('generateReport', () => {
    it('generates report', async () => {
      const result = await controller.generateReport(
        { type: 'bookings', dateFrom: '2026-01-01', dateTo: '2026-01-31' } as any,
        'admin1',
      ) as any;
      expect(result.status).toBe('PROCESSING');
    });
  });

  describe('getReportStatus', () => {
    it('returns report status', async () => {
      const result = await controller.getReportStatus('123e4567-e89b-12d3-a456-426614174000') as any;
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('getAuditLog', () => {
    it('returns audit log', async () => {
      const result = await controller.getAuditLog({});
      expect(result.meta.total).toBe(0);
    });
  });
});
