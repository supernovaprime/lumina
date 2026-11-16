-- Self-contained additive migration. The earlier PostGIS migration may or may
-- not have been applied; all statements are idempotent so either order works.
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "Business"
  ADD COLUMN IF NOT EXISTS "location" geography(POINT, 4326);

CREATE INDEX IF NOT EXISTS "Booking_status_date_idx"
  ON "Booking"("status", "date");
CREATE INDEX IF NOT EXISTS "Booking_status_createdAt_idx"
  ON "Booking"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Booking_businessId_createdAt_idx"
  ON "Booking"("businessId", "createdAt");
CREATE INDEX IF NOT EXISTS "Booking_customerId_createdAt_idx"
  ON "Booking"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Booking_businessId_date_idx"
  ON "Booking"("businessId", "date");
CREATE INDEX IF NOT EXISTS "Booking_customerId_date_idx"
  ON "Booking"("customerId", "date");
CREATE INDEX IF NOT EXISTS "Booking_businessId_status_date_idx"
  ON "Booking"("businessId", "status", "date");
CREATE INDEX IF NOT EXISTS "Booking_businessId_status_createdAt_idx"
  ON "Booking"("businessId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "Business_createdAt_idx"
  ON "Business"("createdAt");
CREATE INDEX IF NOT EXISTS "Business_verificationStatus_createdAt_idx"
  ON "Business"("verificationStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "Business_isActive_createdAt_idx"
  ON "Business"("isActive", "createdAt");

CREATE INDEX IF NOT EXISTS "Notification_status_channel_createdAt_idx"
  ON "Notification"("status", "channel", "createdAt");

CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx"
  ON "PasswordResetToken"("userId");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx"
  ON "PasswordResetToken"("expiresAt");

CREATE INDEX IF NOT EXISTS "Payment_createdAt_idx"
  ON "Payment"("createdAt");
CREATE INDEX IF NOT EXISTS "Payment_status_createdAt_idx"
  ON "Payment"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "RefreshToken_expiresAt_idx"
  ON "RefreshToken"("expiresAt");

CREATE INDEX IF NOT EXISTS "User_createdAt_idx"
  ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS "User_lastLoginAt_idx"
  ON "User"("lastLoginAt");
CREATE INDEX IF NOT EXISTS "User_role_createdAt_idx"
  ON "User"("role", "createdAt");
CREATE INDEX IF NOT EXISTS "User_role_lastLoginAt_idx"
  ON "User"("role", "lastLoginAt");

CREATE INDEX IF NOT EXISTS "VerificationToken_userId_idx"
  ON "VerificationToken"("userId");
CREATE INDEX IF NOT EXISTS "VerificationToken_expiresAt_idx"
  ON "VerificationToken"("expiresAt");
