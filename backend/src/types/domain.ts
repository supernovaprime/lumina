import { BookingStatus, VehicleType, VehicleSize } from '@prisma/client';

export type BookingAction = 'CONFIRM' | 'START' | 'COMPLETE' | 'NO_SHOW';

export interface CancelPolicy {
  freeCancelHours: number;
  lateCancelFeePercent: number;
  noShowFeePercent: number;
}

export interface SlotDTO {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  remaining: number;
  isAvailable: boolean;
}

export interface PriceBreakdown {
  basePriceCents: number;
  multiplier: number;
  unitPriceCents: number;
  totalPriceCents: number;
  currency: string;
}

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

export interface BookingDetail {
  id: string;
  status: BookingStatus;
  date: Date;
  timeSlot: string;
  totalPrice: number;
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
