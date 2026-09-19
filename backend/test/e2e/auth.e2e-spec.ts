import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// @ts-ignore - supertest types not installed; e2e tests run separately
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/libs/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
    await app.init();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'e2e-auth-test' } },
    });
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new customer', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'e2e-auth-test-register@test.com',
          password: 'TestPass123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
        });
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'e2e-auth-test-dup@test.com',
          password: 'TestPass123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'e2e-auth-test-dup@test.com',
          password: 'TestPass123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(409);
    });

    it('should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'TestPass123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'e2e-auth-test-login@test.com',
          password: 'TestPass123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'e2e-auth-test-login@test.com',
          password: 'TestPass123!',
        })
        .expect(200)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('accessToken');
        });
    });

    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'e2e-auth-test-nonexistent@test.com',
          password: 'WrongPass123!',
        })
        .expect(401);
    });
  });
});
