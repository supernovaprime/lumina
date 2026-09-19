-- Migration: Add Refund model, PARTIAL_REFUNDED status, and missing indexes
-- Run this in Supabase SQL Editor

-- Add PARTIAL_REFUNDED to PaymentStatus enum
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIAL_REFUNDED';

-- Create RefundStatus enum
DO $$ BEGIN
  CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create Refund table
CREATE TABLE IF NOT EXISTS "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "stripeRefundId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- Create indexes on Refund
CREATE INDEX IF NOT EXISTS "Refund_paymentId_idx" ON "Refund"("paymentId");
CREATE INDEX IF NOT EXISTS "Refund_status_idx" ON "Refund"("status");

-- Add foreign key for Refund -> Payment
DO $$ BEGIN
  ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add missing indexes on Booking
CREATE INDEX IF NOT EXISTS "Booking_businessId_idx" ON "Booking"("businessId");
CREATE INDEX IF NOT EXISTS "Booking_customerId_idx" ON "Booking"("customerId");
CREATE INDEX IF NOT EXISTS "Booking_status_idx" ON "Booking"("status");
CREATE INDEX IF NOT EXISTS "Booking_date_idx" ON "Booking"("date");
CREATE INDEX IF NOT EXISTS "Booking_createdAt_idx" ON "Booking"("createdAt");

-- Add missing indexes on Service
CREATE INDEX IF NOT EXISTS "Service_businessId_idx" ON "Service"("businessId");

-- Add missing indexes on User
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");

-- Add missing indexes on RefreshToken
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- Add missing indexes on Review
CREATE INDEX IF NOT EXISTS "Review_businessId_idx" ON "Review"("businessId");
CREATE INDEX IF NOT EXISTS "Review_customerId_idx" ON "Review"("customerId");
CREATE INDEX IF NOT EXISTS "Review_isHidden_idx" ON "Review"("isHidden");

-- Add missing indexes on Notification
CREATE INDEX IF NOT EXISTS "Notification_status_idx" ON "Notification"("status");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
