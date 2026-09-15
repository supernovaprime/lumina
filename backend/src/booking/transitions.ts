import { BookingStatus } from '@prisma/client';

export const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
