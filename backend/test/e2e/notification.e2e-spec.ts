import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// @ts-ignore - supertest types not installed; e2e tests run separately
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/libs/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Notification (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let userToken: string;
  let testUserId: string;
  let testNotificationId: string;

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

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'e2e-notification@test.com',
        passwordHash: '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
        role: 'CUSTOMER',
        isActive: true,
      },
    });
    testUserId = user.id;

    // Create test notification
    const notification = await prisma.notification.create({
      data: {
        userId: testUserId,
        type: 'booking-created',
        title: 'Booking Created',
        body: 'Your booking has been created',
        channel: 'IN_APP',
        status: 'SENT',
      },
    });
    testNotificationId = notification.id;

    userToken = jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await app.close();
  });

  describe('/notifications (GET)', () => {
    it('should return user notifications', () => {
      return request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(401);
    });
  });

  describe('/notifications/:id/read (PATCH)', () => {
    it('should mark notification as read', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/notifications/${testNotificationId}/read`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.message).toBe('Notification marked as read');
        });
    });
  });

  describe('/notifications/read-all (PATCH)', () => {
    it('should mark all notifications as read', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.message).toBe('All notifications marked as read');
        });
    });
  });
});
