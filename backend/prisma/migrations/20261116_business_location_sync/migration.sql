-- Keep the PostGIS geography column in sync with the float lat/lng columns.
-- Without this, businesses created after the initial backfill have a NULL
-- location and disappear from ST_DWithin geo searches.
CREATE OR REPLACE FUNCTION sync_business_location()
RETURNS trigger AS $$
BEGIN
  IF NEW."latitude" IS NOT NULL AND NEW."longitude" IS NOT NULL THEN
    NEW."location" := ST_SetSRID(
      ST_MakePoint(NEW."longitude", NEW."latitude"),
      4326
    )::geography;
  ELSE
    NEW."location" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS business_location_sync ON "Business";

CREATE TRIGGER business_location_sync
BEFORE INSERT OR UPDATE OF "latitude", "longitude" ON "Business"
FOR EACH ROW EXECUTE FUNCTION sync_business_location();

UPDATE "Business"
SET "location" = ST_SetSRID(
  ST_MakePoint("longitude", "latitude"),
  4326
)::geography
WHERE "location" IS NULL
  AND "latitude" IS NOT NULL
  AND "longitude" IS NOT NULL;
