export const QUEUES = {
  NOTIFICATIONS: 'notifications',
  SCHEDULING: 'scheduling',
  BOOKINGS: 'bookings',
  REPORTS: 'reports',
} as const;

export const JOB_TYPES = {
  SEND_EMAIL: 'send-email',
  SEND_SMS: 'send-sms',
  SEND_REMINDERS: 'send-reminders',
  GENERATE_SLOTS: 'generate-slots',
  RECONCILE_SLOTS: 'reconcile-slots',
  BOOKING_HOLD_EXPIRY: 'booking-hold-expiry',
  REVIEW_REQUEST: 'review-request',
  REPORT_EXPORT: 'report-export',
} as const;

export interface JobPayload {
  type: string;
  data: Record<string, any>;
  priority?: number;
  delay?: number;
  attempts?: number;
}
