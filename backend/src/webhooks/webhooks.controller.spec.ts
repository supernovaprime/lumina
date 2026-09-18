import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { PaymentService } from '../payment/payment.service';
import { ConfigService } from '@nestjs/config';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let paymentService: any;
  let configService: any;

  beforeEach(async () => {
    paymentService = {
      handleWebhookEvent: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, string> = {
          STRIPE_SECRET_KEY: '',
          STRIPE_WEBHOOK_SECRET: '',
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: PaymentService, useValue: paymentService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('handleStripeWebhook', () => {
    it('returns 200 for valid webhook payload when verification disabled', async () => {
      const req = { body: { type: 'payment_intent.succeeded', data: { object: {} } }, headers: {} } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

      await controller.handleStripeWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('returns 400 for invalid payload', async () => {
      const req = { body: {}, headers: {} } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

      await controller.handleStripeWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('calls paymentService.handleWebhookEvent', async () => {
      const event = { type: 'payment_intent.succeeded', data: { object: {} } };
      const req = { body: event, headers: {} } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

      await controller.handleStripeWebhook(req, res);
      expect(paymentService.handleWebhookEvent).toHaveBeenCalledWith(event);
    });

    it('always returns 200 even on processing error', async () => {
      paymentService.handleWebhookEvent.mockRejectedValue(new Error('Process error'));
      const req = { body: { type: 'test', data: {} }, headers: {} } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

      await controller.handleStripeWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 400 when signature is missing and verification is enabled', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, string> = {
          STRIPE_SECRET_KEY: 'sk_test_real',
          STRIPE_WEBHOOK_SECRET: 'whsec_test',
        };
        return config[key] ?? defaultValue;
      });

      const module = await Test.createTestingModule({
        controllers: [WebhooksController],
        providers: [
          { provide: PaymentService, useValue: paymentService },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const ctrl = module.get<WebhooksController>(WebhooksController);

      const req = { body: { type: 'test' }, headers: {} } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

      await ctrl.handleStripeWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing signature' });
    });

    it('returns 400 when raw body is missing and verification is enabled', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, string> = {
          STRIPE_SECRET_KEY: 'sk_test_real',
          STRIPE_WEBHOOK_SECRET: 'whsec_test',
        };
        return config[key] ?? defaultValue;
      });

      const module = await Test.createTestingModule({
        controllers: [WebhooksController],
        providers: [
          { provide: PaymentService, useValue: paymentService },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const ctrl = module.get<WebhooksController>(WebhooksController);

      const req = { body: { type: 'test' }, headers: { 'stripe-signature': 'sig_test' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

      await ctrl.handleStripeWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing signature' });
    });

    it('returns 400 when signature verification fails', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, string> = {
          STRIPE_SECRET_KEY: 'sk_test_real',
          STRIPE_WEBHOOK_SECRET: 'whsec_test',
        };
        return config[key] ?? defaultValue;
      });

      const module = await Test.createTestingModule({
        controllers: [WebhooksController],
        providers: [
          { provide: PaymentService, useValue: paymentService },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const ctrl = module.get<WebhooksController>(WebhooksController);

      const req = {
        body: { type: 'test' },
        headers: { 'stripe-signature': 'invalid_sig' },
        rawBody: Buffer.from('test body'),
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

      await ctrl.handleStripeWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid signature' });
    });

    it('processes event when signature is valid', async () => {
      const Stripe = require('stripe');
      const stripeInstance = new Stripe('sk_test_fake');
      const webhookSecret = 'whsec_test_secret';

      const payload = JSON.stringify({ type: 'test', data: { object: {} } });
      const timestamp = Math.floor(Date.now() / 1000);
      const sig = stripeInstance.webhooks.generateTestHeaderString({
        payload,
        secret: webhookSecret,
        timestamp,
      });

      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, string> = {
          STRIPE_SECRET_KEY: 'sk_test_fake',
          STRIPE_WEBHOOK_SECRET: webhookSecret,
        };
        return config[key] ?? defaultValue;
      });

      const module = await Test.createTestingModule({
        controllers: [WebhooksController],
        providers: [
          { provide: PaymentService, useValue: paymentService },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const ctrl = module.get<WebhooksController>(WebhooksController);

      const req = {
        body: payload,
        headers: { 'stripe-signature': sig },
        rawBody: payload,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

      await ctrl.handleStripeWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });
});
