import { canTransition, VALID_TRANSITIONS } from './transitions';
import { BookingStatus } from '@prisma/client';

describe('Transitions', () => {
  describe('canTransition', () => {
    it('PENDING→CONFIRMED is valid', () => {
      expect(canTransition('PENDING', 'CONFIRMED')).toBe(true);
    });

    it('PENDING→CANCELLED is valid', () => {
      expect(canTransition('PENDING', 'CANCELLED')).toBe(true);
    });

    it('PENDING→COMPLETED is invalid', () => {
      expect(canTransition('PENDING', 'COMPLETED')).toBe(false);
    });

    it('PENDING→IN_PROGRESS is invalid', () => {
      expect(canTransition('PENDING', 'IN_PROGRESS')).toBe(false);
    });

    it('CONFIRMED→IN_PROGRESS is valid', () => {
      expect(canTransition('CONFIRMED', 'IN_PROGRESS')).toBe(true);
    });

    it('CONFIRMED→CANCELLED is valid', () => {
      expect(canTransition('CONFIRMED', 'CANCELLED')).toBe(true);
    });

    it('IN_PROGRESS→COMPLETED is valid', () => {
      expect(canTransition('IN_PROGRESS', 'COMPLETED')).toBe(true);
    });

    it('IN_PROGRESS→CANCELLED is invalid', () => {
      expect(canTransition('IN_PROGRESS', 'CANCELLED')).toBe(false);
    });

    it('COMPLETED→REFUNDED is valid', () => {
      expect(canTransition('COMPLETED', 'REFUNDED')).toBe(true);
    });

    it('COMPLETED→CANCELLED is invalid', () => {
      expect(canTransition('COMPLETED', 'CANCELLED')).toBe(false);
    });

    it('CANCELLED→anything is invalid', () => {
      expect(canTransition('CANCELLED', 'CONFIRMED')).toBe(false);
      expect(canTransition('CANCELLED', 'COMPLETED')).toBe(false);
    });

    it('REFUNDED→anything is invalid', () => {
      expect(canTransition('REFUNDED', 'CONFIRMED')).toBe(false);
      expect(canTransition('REFUNDED', 'COMPLETED')).toBe(false);
    });
  });

  describe('VALID_TRANSITIONS', () => {
    it('has all booking statuses', () => {
      const statuses: BookingStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED'];
      for (const status of statuses) {
        expect(VALID_TRANSITIONS[status]).toBeDefined();
      }
    });
  });
});
