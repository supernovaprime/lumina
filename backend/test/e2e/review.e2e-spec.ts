import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// @ts-ignore - supertest types not installed; e2e tests run separately
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/libs/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Review (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let customerToken: string;
  let businessOwnerToken: string;
  let testUserId: string;
  let testBusinessId: string;
  let testBookingId: string;
  let testReviewId: string;

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

    // Create business owner
    const owner = await prisma.user.create({
      data: {
        email: 'e2e-review-owner@test.com',
        passwordHash: '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
        role: 'BUSINESS',
        isActive: true,
      },
    });

    // Create customer
    const customer = await prisma.user.create({
      data: {
        email: 'e2e-review-customer@test.com',
        passwordHash: '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
        role: 'CUSTOMER',
        isActive: true,
        customer: {
          create: { firstName: 'Review', lastName: 'Test', phone: '+1234567890' },
        },
      },
      include: { customer: true },
    });
    testUserId = customer.id;

    // Create business
    const business = await prisma.business.create({
      data: {
        ownerId: owner.id,
        name: 'E2E Review Test Wash',
        address: '123 Test St',
        city: 'Testville',
        state: 'TS',
        zipCode: '12345',
        latitude: 40.7128,
        longitude: -74.0060,
        phone: '+1234567890',
        email: 'review-wash@test.com',
        isVerified: true,
        isActive: true,
        verificationStatus: 'APPROVED',
      },
    });
    testBusinessId = business.id;

    // Create service
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

    // Create vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        customerId: customer.customer!.id,
        make: 'Toyota',
        model: 'Camry',
        year: 2024,
        licensePlate: 'E2E-REVIEW-001',
        type: 'SEDAN',
        size: 'MEDIUM',
      },
    });

    // Create completed booking (old enough for review)
    const booking = await prisma.booking.create({
      data: {
        customerId: customer.customer!.id,
        businessId: testBusinessId,
        serviceId: service.id,
        vehicleId: vehicle.id,
        timeSlotId: (await prisma.timeSlot.create({
          data: {
            businessId: testBusinessId,
            date: new Date(Date.now() - 86400000 * 3),
            startTime: '10:00',
            endTime: '10:30',
            isAvailable: false,
            maxBookings: 1,
            currentBookings: 1,
          },
        })).id,
        date: new Date(Date.now() - 86400000 * 3),
        timeSlot: '10:00',
        status: 'COMPLETED',
        totalPrice: 25.00,
      },
    });
    testBookingId = booking.id;

    // Create existing review
    const review = await prisma.review.create({
      data: {
        bookingId: testBookingId,
        customerId: customer.customer!.id,
        businessId: testBusinessId,
        rating: 4,
        comment: 'Good wash',
      },
    });
    testReviewId = review.id;

    // Generate tokens
    customerToken = jwtService.sign({
      sub: testUserId,
      email: customer.email,
      role: customer.role,
    });

    businessOwnerToken = jwtService.sign({
      sub: owner.id,
      email: owner.email,
      role: owner.role,
    });
  });

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { id: testReviewId } });
    await prisma.booking.deleteMany({ where: { id: testBookingId } });
    await prisma.timeSlot.deleteMany({ where: { businessId: testBusinessId } });
    await prisma.service.deleteMany({ where: { businessId: testBusinessId } });
    await prisma.vehicle.deleteMany({ where: { customerId: testUserId } });
    await prisma.business.deleteMany({ where: { id: testBusinessId } });
    await prisma.user.deleteMany({
      where: { email: { contains: 'e2e-review' } },
    });
    await app.close();
  });

  describe('/reviews/business/:businessId (GET)', () => {
    it('should return reviews for a business', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/reviews/business/${testBusinessId}`)
        .expect(200)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.reviews).toBeInstanceOf(Array);
          expect(res.body.data.total).toBeGreaterThanOrEqual(1);
        });
    });
  });

  describe('/reviews/:id/respond (POST)', () => {
    it('should allow business owner to respond to review', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/reviews/${testReviewId}/respond`)
        .set('Authorization', `Bearer ${businessOwnerToken}`)
        .send({ response: 'Thank you for your feedback!' })
        .expect(201)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.response).toBe('Thank you for your feedback!');
        });
    });

    it('should prevent duplicate response', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/reviews/${testReviewId}/respond`)
        .set('Authorization', `Bearer ${businessOwnerToken}`)
        .send({ response: 'Second response' })
        .expect(409);
    });

    it('should allow business owner to edit response', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/reviews/${testReviewId}/respond`)
        .set('Authorization', `Bearer ${businessOwnerToken}`)
        .send({ response: 'Updated response!' })
        .expect(200)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.response).toBe('Updated response!');
        });
    });
  });
});
