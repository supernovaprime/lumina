import { Test, TestingModule } from '@nestjs/testing';
import { SmsService } from './sms.service';

describe('SmsService', () => {
  let service: SmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmsService],
    }).compile();

    service = module.get<SmsService>(SmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('send', () => {
    it('should log message', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.send({ to: '+1234567890', message: 'Hello from CarWash' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('+1234567890'),
      );
      consoleSpy.mockRestore();
    });
  });
});
