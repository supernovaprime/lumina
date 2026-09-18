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

export interface NearbyBusiness {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  logo: string | null;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isActive: boolean;
  distanceKm: number;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

  constructor(private readonly prisma: PrismaService) {}

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

  haversineDistance(a: GeoPoint, b: GeoPoint): number {
    const R = 6371;
    const dLat = this.toRad(b.latitude - a.latitude);
    const dLon = this.toRad(b.longitude - a.longitude);
    const lat1 = this.toRad(a.latitude);
    const lat2 = this.toRad(b.latitude);

    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    options: { limit?: number; cursor?: string; isVerified?: boolean } = {},
  ): Promise<{ businesses: NearbyBusiness[]; nextCursor?: string }> {
    const { limit = 20, cursor, isVerified = true } = options;
    const radiusMeters = radiusKm * 1000;

    const filters: string[] = [];
    const params: any[] = [lat, lng, radiusMeters];
    let paramIdx = 4;

    filters.push(`b."location" IS NOT NULL`);
    filters.push(`ST_DWithin(b."location", ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)`);

    if (isVerified) {
      filters.push(`b."isVerified" = true`);
      filters.push(`b."isActive" = true`);
    }

    if (cursor) {
      filters.push(`b."id" > $${paramIdx}`);
      params.push(cursor);
      paramIdx++;
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const query = `
      SELECT b."id", b."name", b."address", b."city", b."state", b."zipCode",
             b."latitude", b."longitude", b."phone", b."email", b."logo",
             b."rating", b."reviewCount", b."isVerified", b."isActive",
             ST_Distance(b."location", ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) AS "distanceKm"
      FROM "Business" b
      ${whereClause}
      ORDER BY b."id" ASC
      LIMIT $${paramIdx}
    `;
    params.push(limit + 1);

    try {
      const rows = await this.prisma.$queryRawUnsafe<any[]>(query, ...params);
      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;

      return {
        businesses: data.map((b) => ({
          ...b,
          distanceKm: Number(b.distanceKm) / 1000,
        })),
        nextCursor: hasMore ? data[data.length - 1].id : undefined,
      };
    } catch (err) {
      this.logger.warn(`PostGIS query failed, falling back to Haversine: ${(err as Error).message}`);
      return this.findNearbyFallback(lat, lng, radiusKm, { limit, cursor, isVerified });
    }
  }

  private async findNearbyFallback(
    lat: number,
    lng: number,
    radiusKm: number,
    options: { limit: number; cursor?: string; isVerified: boolean },
  ): Promise<{ businesses: NearbyBusiness[]; nextCursor?: string }> {
    const { limit, cursor, isVerified } = options;

    const conditions: string[] = [];
    const params: any[] = [lat, lng, radiusKm];
    let paramIdx = 4;

    conditions.push(`b."latitude" IS NOT NULL AND b."longitude" IS NOT NULL`);

    if (isVerified) {
      conditions.push(`b."isVerified" = true AND b."isActive" = true`);
    }

    if (cursor) {
      conditions.push(`b."id" > $${paramIdx}`);
      params.push(cursor);
      paramIdx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT b."id", b."name", b."address", b."city", b."state", b."zipCode",
             b."latitude", b."longitude", b."phone", b."email", b."logo",
             b."rating", b."reviewCount", b."isVerified", b."isActive",
             (6371 * acos(
               cos(radians($1)) * cos(radians(b."latitude")) *
               cos(radians(b."longitude") - radians($2)) +
               sin(radians($1)) * sin(radians(b."latitude"))
             )) AS "distanceKm"
      FROM "Business" b
      ${whereClause}
      HAVING "distanceKm" <= $3
      ORDER BY "distanceKm" ASC, b."id" ASC
      LIMIT $${paramIdx}
    `;
    params.push(limit + 1);

    const rows = await this.prisma.$queryRawUnsafe<any[]>(query, ...params);
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    return {
      businesses: data.map((b) => ({
        ...b,
        distanceKm: Number(b.distanceKm),
      })),
      nextCursor: hasMore ? data[data.length - 1].id : undefined,
    };
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
