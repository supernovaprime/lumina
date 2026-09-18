import { Test, TestingModule } from '@nestjs/testing';
import { SmsService } from './sms.service';
import { ConfigService } from '@nestjs/config';

describe('SmsService', () => {
  let service: SmsService;
  let config: any;

  beforeEach(async () => {
    config = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const configMap: Record<string, string> = {
          MNOTIFY_API_KEY: 'test-api-key',
          MNOTIFY_SENDER_ID: 'CarWash',
        };
        return configMap[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('isConfigured', () => {
    it('returns true when API key is set', () => {
      expect(service.isConfigured).toBe(true);
    });

    it('returns false when API key is empty', () => {
      config.get.mockReturnValue('');
      const svc = new SmsService(config);
      expect(svc.isConfigured).toBe(false);
    });
  });

  describe('send', () => {
    it('sends SMS successfully', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: '2000', message: 'Success', data: { msg_id: 'msg-123' } }),
      });
      global.fetch = mockFetch;

      const result = await service.send({ to: '+233240000000', message: 'Hello' });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.mnotify.com/api/v1/sms/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-api-key' }),
        }),
      );
    });

    it('returns failure when API returns error code', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: '4000', message: 'Invalid number' }),
      });

      const result = await service.send({ to: 'invalid', message: 'Hello' });
      expect(result.success).toBe(false);
    });

    it('returns failure on network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network down'));

      const result = await service.send({ to: '+233240000000', message: 'Hello' });
      expect(result.success).toBe(false);
    });

    it('returns failure when not configured', async () => {
      config.get.mockReturnValue('');
      const svc = new SmsService(config);

      const result = await svc.send({ to: '+233240000000', message: 'Hello' });
      expect(result.success).toBe(false);
    });

    it('returns failure on HTTP error response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Server error' }),
      });

      const result = await service.send({ to: '+233240000000', message: 'Hello' });
      expect(result.success).toBe(false);
    });
  });
});
