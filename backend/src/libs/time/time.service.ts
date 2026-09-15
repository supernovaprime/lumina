import { Injectable } from '@nestjs/common';
import { addMinutes, isAfter, isBefore, parseISO, format } from 'date-fns';
import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz';

@Injectable()
export class TimeService {
  toUTC(dateStr: string, timeStr: string, timezone: string): Date {
    const localDateTime = `${dateStr}T${timeStr}:00`;
    const zoned = toZonedTime(localDateTime, timezone);
    return fromZonedTime(zoned, timezone);
  }

  toLocalDate(utcDate: Date, timezone: string): string {
    return formatTz(toZonedTime(utcDate, timezone), 'yyyy-MM-dd', { timeZone: timezone });
  }

  toLocalTime(utcDate: Date, timezone: string): string {
    return formatTz(toZonedTime(utcDate, timezone), 'HH:mm', { timeZone: timezone });
  }

  isFreeCancel(startTime: Date, hoursThreshold: number = 24): boolean {
    const threshold = addMinutes(startTime, -hoursThreshold * 60);
    return isAfter(threshold, new Date());
  }

  isWithinWindow(dateStr: string, days: number): boolean {
    const date = parseISO(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = addMinutes(today, days * 24 * 60);
    return !isBefore(date, today) && !isAfter(date, end);
  }

  addMinutes(date: Date, minutes: number): Date {
    return addMinutes(date, minutes);
  }

  formatISO(date: Date): string {
    return date.toISOString();
  }

  getDayKey(date: Date): string {
    return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
  }

  today(): string {
    return format(new Date(), 'yyyy-MM-dd');
  }
}
