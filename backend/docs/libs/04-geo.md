# Geo Service Scaffold

## Purpose
Geocoding via Nominatim (free, no API key) + distance queries via raw SQL.
PostGIS not required for MVP — use Haversine formula for distance sorting.

## File: `src/libs/geo/geo.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface GeocodedAddress {
  latitude: number;
  longitude: number;
  displayName: string;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Geocode an address string to lat/lng via Nominatim.
   * Returns null on failure (never throws — non-critical path).
   */
  async geocode(address: string): Promise<GeocodedAddress | null> {
    try {
      const params = new URLSearchParams({
        q: address,
        format: 'json',
        limit: '1',
      });
      const res = await fetch(`${this.NOMINATIM_URL}/search?${params}`, {
        headers: { 'User-Agent': 'CarWash/1.0' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.length) return null;
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
    } catch {
      this.logger.warn('Geocoding failed for address: ' + address);
      return null;
    }
  }

  /**
   * Calculate distance in km between two points using Haversine formula.
   */
  haversineDistance(a: GeoPoint, b: GeoPoint): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(b.latitude - a.latitude);
    const dLon = this.toRad(b.longitude - a.longitude);
    const lat1 = this.toRad(a.latitude);
    const lat2 = this.toRad(b.latitude);

    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  /**
   * Find businesses within radius using Haversine.
   * Returns businesses sorted by distance, with distanceKm attached.
   */
  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    options: { limit?: number; offset?: number; isVerified?: boolean } = {},
  ): Promise<Array<any & { distanceKm: number }>> {
    const { limit = 20, offset = 0, isVerified = true } = options;
    const whereClause = isVerified ? 'AND b."isVerified" = true AND b."isActive" = true' : '';

    const businesses = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT b.*,
        (6371 * acos(
          cos(radians($1)) * cos(radians(b.latitude)) *
          cos(radians(b.longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(b.latitude))
        )) AS "distanceKm"
      FROM "Business" b
      WHERE b.latitude IS NOT NULL AND b.longitude IS NOT NULL
      ${whereClause}
      HAVING "distanceKm" <= $3
      ORDER BY "distanceKm" ASC
      LIMIT $4 OFFSET $5`,
      lat, lng, radiusKm, limit, offset,
    );

    return businesses.map((b) => ({
      ...b,
      distanceKm: Number(b.distanceKm),
    }));
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
```

## File: `src/libs/geo/geo.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { GeoService } from './geo.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [GeoService],
  exports: [GeoService],
})
export class GeoModule {}
```

## File: `src/libs/geo/geo.service.spec.ts`

Tests:
1. haversineDistance returns 0 for same point
2. haversineDistance returns ~111km for 1 degree latitude difference
3. haversineDistance returns correct distance for known cities
4. geocode returns null on network failure (graceful)
5. findNearby queries with correct parameters
6. findNearby filters by isVerified when enabled
