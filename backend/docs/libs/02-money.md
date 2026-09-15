# Money Service Scaffold

## Purpose
Canonical price resolution. Never trust client-sent totals. All money in cents (minor units).
`unitPrice = basePrice * multiplier + fixedDelta`, round to nearest cent.

## File: `src/libs/money/money.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

export interface PriceBreakdown {
  basePriceCents: number;
  multiplier: number;
  fixedDeltaCents: number;
  unitPriceCents: number;
  totalPriceCents: number;
  currency: string;
}

@Injectable()
export class MoneyService {
  /**
   * Resolve final price from base price + modifiers for a vehicle type/size.
   * @param basePriceCents - Service base price in cents
   * @param modifiers - Array of matching price modifiers (vehicleType, vehicleSize, multiplier, fixedDelta, kind)
   * @param currency - ISO 4217 currency code (default USD)
   */
  resolvePrice(
    basePriceCents: number,
    modifiers: Array<{ multiplier?: number | null; fixedDeltaCents?: number | null }>,
    currency: string = 'USD',
  ): PriceBreakdown {
    let multiplier = 1;
    let fixedDelta = 0;

    for (const mod of modifiers) {
      if (mod.multiplier != null) multiplier *= mod.multiplier;
      if (mod.fixedDeltaCents != null) fixedDelta += mod.fixedDeltaCents;
    }

    const unitPrice = Math.round(basePriceCents * multiplier + fixedDelta);

    return {
      basePriceCents,
      multiplier,
      fixedDeltaCents: fixedDelta,
      unitPriceCents: unitPrice,
      totalPriceCents: unitPrice, // MVP: single service per booking
      currency,
    };
  }

  /** Convert Decimal to cents integer. */
  toCents(amount: Decimal): number {
    return Math.round(Number(amount) * 100);
  }

  /** Convert cents to Decimal. */
  toDecimal(cents: number): Decimal {
    return new Decimal(cents / 100);
  }

  /** Validate cents is non-negative integer. */
  isValidCents(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
  }
}
```

## File: `src/libs/money/money.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { MoneyService } from './money.service';

@Global()
@Module({
  providers: [MoneyService],
  exports: [MoneyService],
})
export class MoneyModule {}
```

## File: `src/libs/money/money.service.spec.ts`

Tests:
1. resolvePrice with no modifiers returns base price
2. resolvePrice with multiplier applies correctly (e.g. 1.5x)
3. resolvePrice with fixedDelta adds correctly (e.g. +500 cents)
4. resolvePrice with both multiplier and fixedDelta
5. resolvePrice rounds to nearest cent
6. resolvePrice with multiple modifiers compounds multipliers
7. toCents converts Decimal correctly
8. toDecimal converts cents correctly
9. isValidCents validates correctly
