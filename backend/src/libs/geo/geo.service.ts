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
