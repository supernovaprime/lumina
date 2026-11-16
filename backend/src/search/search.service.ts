import { Injectable } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { GeoService } from '../libs/geo/geo.service';
import {
  applyCursorPagination,
  CursorPaginationResult,
} from '../libs/common/cursor-pagination';

export interface SearchFilters {
  query?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  service?: string;
  minRating?: number;
  openNow?: boolean;
  sort?: 'distance' | 'rating' | 'price';
  cursor?: string;
  limit?: number;
}

export interface SearchResult {
  businesses: any[];
  meta: {
    nextCursor?: string;
    hasMore: boolean;
    limit: number;
  };
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly geo: GeoService,
  ) {}

  async search(filters: SearchFilters): Promise<SearchResult> {
    const {
      query,
      lat,
      lng,
      radiusKm = 10,
      service,
      minRating,
      openNow,
      sort = 'distance',
      cursor,
      limit = 20,
    } = filters;

    const cacheKey = CacheService.searchKey(JSON.stringify(filters));
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as SearchResult;

    let results: any[];

    if (lat != null && lng != null) {
      const { businesses } = await this.geo.findNearby(lat, lng, radiusKm, {
        limit: 100,
        cursor,
        isVerified: true,
      });
      results = businesses;
    } else {
      results = await this.textSearch(query, { limit: 100, cursor });
    }

    if (service) {
      results = results.filter((b: any) =>
        b.services?.some((s: any) => s.category === service && s.isActive),
      );
    }

    if (minRating != null) {
      results = results.filter((b: any) => b.rating >= minRating);
    }

    if (openNow) {
      const now = new Date();
      const dayOfWeek = now
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toUpperCase();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      results = results.filter((b: any) => {
        if (!b.operatingHours) return false;
        const hours = b.operatingHours as Record<
          string,
          { open: string; close: string }
        >;
        const todayHours = hours[dayOfWeek];
        if (!todayHours) return false;
        return currentTime >= todayHours.open && currentTime < todayHours.close;
      });
    }

    if (sort === 'rating') {
      results.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'price') {
      results.sort(
        (a: any, b: any) =>
          (a.startingPriceCents || 0) - (b.startingPriceCents || 0),
      );
    }

    const paginated = applyCursorPagination(results, limit, cursor);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const businessIds = paginated.data.map((business: any) => business.id);
    const nextSlots = businessIds.length
      ? await this.prisma.timeSlot.findMany({
          where: {
            businessId: { in: businessIds },
            date: { gte: today },
            isAvailable: true,
          },
          select: {
            businessId: true,
            date: true,
            startTime: true,
            endTime: true,
          },
          orderBy: [
            { businessId: 'asc' },
            { date: 'asc' },
            { startTime: 'asc' },
          ],
        })
      : [];

    const nextSlotByBusiness = new Map<string, (typeof nextSlots)[number]>();
    for (const slot of nextSlots) {
      if (!nextSlotByBusiness.has(slot.businessId)) {
        nextSlotByBusiness.set(slot.businessId, slot);
      }
    }

    const enriched = paginated.data.map((business: any) => {
      const nextSlot = nextSlotByBusiness.get(business.id);
      return {
        ...business,
        nextAvailableSlot: nextSlot
          ? {
              date: nextSlot.date,
              startTime: nextSlot.startTime,
              endTime: nextSlot.endTime,
            }
          : null,
      };
    });

    const response: SearchResult = {
      businesses: enriched,
      meta: paginated.meta,
    };

    await this.cache.set(cacheKey, response, 60);

    return response;
  }

  async invalidateForBusiness(businessId: string): Promise<void> {
    await this.cache.del('search:*');
  }

  private async textSearch(
    query: string | undefined,
    options: { limit: number; cursor?: string },
  ) {
    const where: any = {
      isVerified: true,
      isActive: true,
    };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { city: { contains: query, mode: 'insensitive' } },
        { state: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (options.cursor) {
      where.id = { gt: options.cursor };
    }

    return this.prisma.business.findMany({
      where,
      include: {
        services: {
          where: { isActive: true },
          select: { id: true, name: true, category: true, basePrice: true },
        },
      },
      take: options.limit,
      orderBy: { rating: 'desc' },
    });
  }
}
