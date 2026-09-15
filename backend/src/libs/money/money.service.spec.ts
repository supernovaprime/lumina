import { Test, TestingModule } from '@nestjs/testing';
import { MoneyService } from './money.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('MoneyService', () => {
  let service: MoneyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MoneyService],
    }).compile();

    service = module.get<MoneyService>(MoneyService);
  });

  describe('resolvePrice', () => {
    it('returns base price with no multiplier', () => {
      const result = service.resolvePrice(1000);
      expect(result.unitPriceCents).toBe(1000);
      expect(result.totalPriceCents).toBe(1000);
      expect(result.multiplier).toBe(1);
    });

    it('applies multiplier correctly', () => {
      const result = service.resolvePrice(1000, 1.5);
      expect(result.unitPriceCents).toBe(1500);
      expect(result.multiplier).toBe(1.5);
    });

    it('rounds to nearest cent', () => {
      const result = service.resolvePrice(1000, 1.33);
      expect(result.unitPriceCents).toBe(1330);
    });

    it('returns USD as default currency', () => {
      const result = service.resolvePrice(1000);
      expect(result.currency).toBe('USD');
    });

    it('uses custom currency', () => {
      const result = service.resolvePrice(1000, 1, 'EUR');
      expect(result.currency).toBe('EUR');
    });
  });

  describe('toCents', () => {
    it('converts Decimal to cents', () => {
      expect(service.toCents(new Decimal(10.50))).toBe(1050);
    });

    it('rounds correctly', () => {
      expect(service.toCents(new Decimal(10.505))).toBe(1051);
    });
  });

  describe('toDecimal', () => {
    it('converts cents to Decimal', () => {
      const result = service.toDecimal(1050);
      expect(Number(result)).toBe(10.50);
    });
  });

  describe('isValidCents', () => {
    it('returns true for valid cents', () => {
      expect(service.isValidCents(0)).toBe(true);
      expect(service.isValidCents(100)).toBe(true);
    });

    it('returns false for negative', () => {
      expect(service.isValidCents(-1)).toBe(false);
    });

    it('returns false for non-integer', () => {
      expect(service.isValidCents(10.5)).toBe(false);
    });

    it('returns false for non-number', () => {
      expect(service.isValidCents('100')).toBe(false);
    });
  });
});
