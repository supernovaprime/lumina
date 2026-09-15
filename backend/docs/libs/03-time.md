# Time Service Scaffold

## Purpose
Timezone-safe helpers. Business stores timezone (e.g. "America/New_York").
Client sends `date: YYYY-MM-DD` + `startTime: HH:mm` in business local time.
Backend converts to UTC for storage/comparison. Uses `date-fns-tz` (free, no API key).

## File: `src/libs/time/time.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { addMinutes, isAfter, isBefore, parseISO, format } from 'date-fns';
import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz';

@Injectable()
export class TimeService {
  /**
   * Convert business-local date+time to UTC Date.
   * @param dateStr - "YYYY-MM-DD" in business timezone
   * @param timeStr - "HH:mm" in business timezone
   * @param timezone - IANA timezone e.g. "America/New_York"
   */
  toUTC(dateStr: string, timeStr: string, timezone: string): Date {
    const localDateTime = `${dateStr}T${timeStr}:00`;
    const zoned = toZonedTime(localDateTime, timezone);
    return fromZonedTime(zoned, timezone);
  }

  /**
   * Convert UTC Date to business-local date string.
   */
  toLocalDate(utcDate: Date, timezone: string): string {
    return formatTz(toZonedTime(utcDate, timezone), 'yyyy-MM-dd', { timeZone: timezone });
  }

  /**
   * Convert UTC Date to business-local time string.
   */
  toLocalTime(utcDate: Date, timezone: string): string {
    return formatTz(toZonedTime(utcDate, timezone), 'HH:mm', { timeZone: timezone });
  }

  /**
   * Check if cancellation is free (>=24h before startTime).
   * @param startTime - booking start in UTC
   * @param hoursThreshold - minimum hours before start for free cancel (default 24)
   */
  isFreeCancel(startTime: Date, hoursThreshold: number = 24): boolean {
    const threshold = addMinutes(startTime, -hoursThreshold * 60);
    return isAfter(threshold, new Date());
  }

  /**
   * Check if a date string is within a window [today, today+days].
   */
  isWithinWindow(dateStr: string, days: number): boolean {
    const date = parseISO(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = addMinutes(today, days * 24 * 60);
    return !isBefore(date, today) && !isAfter(date, end);
  }

  /**
   * Add minutes to a Date.
   */
  addMinutes(date: Date, minutes: number): Date {
    return addMinutes(date, minutes);
  }

  /**
   * Format date as ISO string.
   */
  formatISO(date: Date): string {
    return date.toISOString();
  }

  /**
   * Get day of week key from date (sun, mon, tue, etc.).
   */
  getDayKey(date: Date): string {
    return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
  }

  /**
   * Get today's date string in YYYY-MM-DD format.
   */
  today(): string {
    return format(new Date(), 'yyyy-MM-dd');
  }
}
```

## File: `src/libs/time/time.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { TimeService } from './time.service';

@Global()
@Module({
  providers: [TimeService],
  exports: [TimeService],
})
export class TimeModule {}
```

## File: `src/libs/time/time.service.spec.ts`

Tests:
1. toUTC converts local date+time to UTC correctly
2. toLocalDate converts UTC to local date string
3. toLocalTime converts UTC to local time string
4. isFreeCancel returns true when >24h before start
5. isFreeCancel returns false when <24h before start
6. isWithinWindow returns true for today
7. isWithinWindow returns true for future date within range
8. isWithinWindow returns false for past date
9. isWithinWindow returns false for date beyond range
10. getDayKey returns correct day abbreviation
11. today returns YYYY-MM-DD format
