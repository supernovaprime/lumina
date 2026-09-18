import { Injectable } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { GeoService } from '../libs/geo/geo.service';
import { applyCursorPagination, CursorPaginationResult } from '../libs/common/cursor-pagination';

export interface SearchFilters {
  query?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  service?: string;
  minRating?: number;
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
    const { query, lat, lng, radiusKm = 10, service, minRating, sort = 'distance', cursor, limit = 20 } = filters;

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

    if (sort === 'rating') {
      results.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'price') {
      results.sort((a: any, b: any) => (a.startingPriceCents || 0) - (b.startingPriceCents || 0));
    }

    const paginated = applyCursorPagination(results, limit, cursor);

    const response: SearchResult = {
      businesses: paginated.data,
      meta: paginated.meta,
    };

    await this.cache.set(cacheKey, response, 60);

    return response;
  }

  private async textSearch(query: string | undefined, options: { limit: number; cursor?: string }) {
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
        services: { where: { isActive: true }, select: { id: true, name: true, category: true, basePrice: true } },
      },
      take: options.limit,
      orderBy: { rating: 'desc' },
    });
  }
}
