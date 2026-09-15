import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

export interface PriceBreakdown {
  basePriceCents: number;
  multiplier: number;
  unitPriceCents: number;
  totalPriceCents: number;
  currency: string;
}

@Injectable()
export class MoneyService {
  resolvePrice(
    basePriceCents: number,
    multiplier: number = 1,
    currency: string = 'USD',
  ): PriceBreakdown {
    const unitPrice = Math.round(basePriceCents * multiplier);

    return {
      basePriceCents,
      multiplier,
      unitPriceCents: unitPrice,
      totalPriceCents: unitPrice,
      currency,
    };
  }

  toCents(amount: Decimal): number {
    return Math.round(Number(amount) * 100);
  }

  toDecimal(cents: number): Decimal {
    return new Decimal(cents / 100);
  }

  isValidCents(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
  }
}
