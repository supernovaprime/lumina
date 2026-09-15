# Types Module Scaffold

## Purpose
Shared type contracts used by both API and worker. Never duplicate Prisma types — import from `@prisma/client`.

## Files to create:
- `src/types/api.ts`
- `src/types/domain.ts`

---

## `src/types/api.ts`

```typescript
/** Standard API success response envelope. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

/** Standard API error response envelope. */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

/** Paginated response wrapper. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Generic API response. */
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
```

---

## `src/types/domain.ts`

```typescript
import { BookingStatus, PaymentMethod, PaymentStatus, VehicleType, VehicleSize } from '@prisma/client';

/** Booking action that can be performed. */
export type BookingAction = 'CONFIRM' | 'START' | 'COMPLETE' | 'NO_SHOW';

/** Cancellation policy configuration. */
export interface CancelPolicy {
  freeCancelHours: number;    // Default 24
  lateCancelFeePercent: number; // Default 0 (MVP)
  noShowFeePercent: number;    // Default 0 (MVP)
}

/** Slot DTO returned by availability queries. */
export interface SlotDTO {
  id: string;
  date: string;          // YYYY-MM-DD
  startTime: string;     // HH:mm
  endTime: string;       // HH:mm
  remaining: number;     // maxBookings - currentBookings
  isAvailable: boolean;
}

/** Price breakdown returned by preview. */
export interface PriceBreakdown {
  basePriceCents: number;
  multiplier: number;
  fixedDeltaCents: number;
  unitPriceCents: number;
  totalPriceCents: number;
  currency: string;
}

/** Search result with distance. */
export interface SearchResult {
  id: string;
  name: string;
  city: string;
  state: string;
  rating: number;
  reviewCount: number;
  startingPriceCents: number;
  distanceKm: number;
  services: Array<{
    id: string;
    name: string;
    category: string;
    basePriceCents: number;
  }>;
}

/** Booking with all relations for detail view. */
export interface BookingDetail {
  id: string;
  status: BookingStatus;
  date: Date;
  startTime: Date;
  endTime: Date;
  totalPriceCents: number;
  currency: string;
  notes?: string;
  cancelledAt?: Date;
  cancelReason?: string;
  business: {
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
  };
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    type: VehicleType;
    size: VehicleSize;
  };
}
```
