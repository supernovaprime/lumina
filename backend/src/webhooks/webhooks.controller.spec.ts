import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { PaymentService } from '../payment/payment.service';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let paymentService: any;

  beforeEach(async () => {
    paymentService = {
      handleWebhookEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: PaymentService, useValue: paymentService },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('handleStripeWebhook', () => {
    it('returns 200 for valid webhook payload', async () => {
      const req = { body: { type: 'payment_intent.succeeded', data: { object: {} } } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

      await controller.handleStripeWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('returns 400 for invalid payload', async () => {
      const req = { body: {} } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

      await controller.handleStripeWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('calls paymentService.handleWebhookEvent', async () => {
      const event = { type: 'payment_intent.succeeded', data: { object: {} } };
      const req = { body: event } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

      await controller.handleStripeWebhook(req, res);
      expect(paymentService.handleWebhookEvent).toHaveBeenCalledWith(event);
    });

    it('always returns 200 even on processing error', async () => {
      paymentService.handleWebhookEvent.mockRejectedValue(new Error('Process error'));
      const req = { body: { type: 'test', data: {} } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

      await controller.handleStripeWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
