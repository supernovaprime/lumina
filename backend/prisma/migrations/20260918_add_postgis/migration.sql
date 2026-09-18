-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column for spatial queries
ALTER TABLE "Business" ADD COLUMN "location" geography(POINT, 4326);

-- Populate location from existing lat/lng
UPDATE "Business" SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography;

-- Create spatial index for fast ST_DWithin queries
CREATE INDEX idx_business_location ON "Business" USING GIST ("location");

-- Create composite index for common filter patterns
CREATE INDEX idx_business_verified_active ON "Business" ("isVerified", "isActive") WHERE "isVerified" = true AND "isActive" = true;
