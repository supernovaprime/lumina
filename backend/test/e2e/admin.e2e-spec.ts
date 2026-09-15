import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// @ts-ignore - supertest types not installed; e2e tests run separately
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/libs/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Admin (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let customerToken: string;

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

    // Create test admin user
    const admin = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        email: 'admin@test.com',
        passwordHash: '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
        role: 'ADMIN',
        isActive: true,
      },
    });

    // Create test customer user
    const customer = await prisma.user.upsert({
      where: { email: 'customer@test.com' },
      update: {},
      create: {
        email: 'customer@test.com',
        passwordHash: '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
        role: 'CUSTOMER',
        isActive: true,
      },
    });

    // Generate JWT tokens
    adminToken = jwtService.sign({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });

    customerToken = jwtService.sign({
      sub: customer.id,
      email: customer.email,
      role: customer.role,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { in: ['admin@test.com', 'customer@test.com'] } },
    });
    await app.close();
  });

  describe('/admin/dashboard (GET)', () => {
    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .expect(401);
    });

    it('should return 403 for CUSTOMER role', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('should return 200 for ADMIN role', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('bookingsToday');
          expect(res.body.data).toHaveProperty('revenueMTD');
          expect(res.body.data).toHaveProperty('activeBusinesses');
          expect(res.body.data).toHaveProperty('pendingVerifications');
          expect(res.body.data).toHaveProperty('totalUsers');
          expect(typeof res.body.data.bookingsToday).toBe('number');
          expect(typeof res.body.data.revenueMTD).toBe('number');
        });
    });

    it('should return cached result on second request', async () => {
      const first = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      const second = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(first.body.data).toEqual(second.body.data);
    });
  });
});
