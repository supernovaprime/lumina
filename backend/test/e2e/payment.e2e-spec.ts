import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// @ts-ignore - supertest types not installed; e2e tests run separately
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/libs/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Payment (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let customerToken: string;
  let adminToken: string;
  let testUserId: string;
  let testCustomerId: string;
  let testBusinessId: string;
  let testServiceId: string;
  let testBookingId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    await app.init();

    // Create test customer
    const customer = await prisma.user.create({
      data: {
        email: 'e2e-payment-customer@test.com',
        passwordHash: '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
        role: 'CUSTOMER',
        isActive: true,
        customer: {
          create: { firstName: 'Pay', lastName: 'Test', phone: '+1234567890' },
        },
      },
      include: { customer: true },
    });
    testUserId = customer.id;
    testCustomerId = customer.customer!.id;

    // Create test admin
    const admin = await prisma.user.create({
      data: {
        email: 'e2e-payment-admin@test.com',
        passwordHash: '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
        role: 'ADMIN',
        isActive: true,
      },
    });

    // Create test business
    const business = await prisma.business.create({
      data: {
        ownerId: admin.id,
        name: 'E2E Payment Test Wash',
        address: '123 Test St',
        city: 'Testville',
        state: 'TS',
        zipCode: '12345',
        latitude: 40.7128,
        longitude: -74.0060,
        phone: '+1234567890',
        email: 'wash@test.com',
        isVerified: true,
        isActive: true,
        verificationStatus: 'APPROVED',
      },
    });
    testBusinessId = business.id;

    // Create test service
    const service = await prisma.service.create({
      data: {
        businessId: testBusinessId,
        name: 'Basic Wash',
        category: 'EXTERIOR',
        basePrice: 25.00,
        durationMinutes: 30,
        isActive: true,
      },
    });
    testServiceId = service.id;

    // Create test time slot
    const slot = await prisma.timeSlot.create({
      data: {
        businessId: testBusinessId,
        date: new Date(Date.now() + 86400000),
        startTime: '10:00',
        endTime: '10:30',
        isAvailable: true,
        maxBookings: 1,
        currentBookings: 0,
      },
    });

    // Create test vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        customerId: testCustomerId,
        make: 'Toyota',
        model: 'Camry',
        year: 2024,
        licensePlate: 'E2E-TEST-001',
        type: 'SEDAN',
        size: 'MEDIUM',
      },
    });

    // Create test booking
    const booking = await prisma.booking.create({
      data: {
        customerId: testCustomerId,
        businessId: testBusinessId,
        serviceId: testServiceId,
        vehicleId: vehicle.id,
        timeSlotId: slot.id,
        date: new Date(Date.now() + 86400000),
        timeSlot: '10:00',
        status: 'PENDING',
        totalPrice: 25.00,
      },
    });
    testBookingId = booking.id;

    // Generate tokens
    customerToken = jwtService.sign({
      sub: testUserId,
      email: customer.email,
      role: customer.role,
    });

    adminToken = jwtService.sign({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { id: testBookingId } });
    await prisma.timeSlot.deleteMany({ where: { businessId: testBusinessId } });
    await prisma.service.deleteMany({ where: { businessId: testBusinessId } });
    await prisma.vehicle.deleteMany({ where: { customerId: testCustomerId } });
    await prisma.business.deleteMany({ where: { id: testBusinessId } });
    await prisma.user.deleteMany({
      where: { email: { contains: 'e2e-payment' } },
    });
    await app.close();
  });

  describe('/payments (POST)', () => {
    it('should create a cash payment', () => {
      return request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          bookingId: testBookingId,
          method: 'CASH',
        })
        .expect(201)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('paymentId');
          expect(res.body.data.status).toBe('COMPLETED');
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/payments')
        .send({
          bookingId: testBookingId,
          method: 'CASH',
        })
        .expect(401);
    });

    it('should return 403 for ADMIN role', () => {
      return request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          bookingId: testBookingId,
          method: 'CASH',
        })
        .expect(403);
    });
  });
});
