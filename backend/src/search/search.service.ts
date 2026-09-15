import { Injectable } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { GeoService } from '../libs/geo/geo.service';

export interface SearchFilters {
  query?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  service?: string;
  minRating?: number;
  sort?: 'distance' | 'rating' | 'price';
  page?: number;
  limit?: number;
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly geo: GeoService,
  ) {}

  async search(filters: SearchFilters) {
    const { query, lat, lng, radiusKm = 10, service, minRating, sort = 'distance', page = 1, limit = 20 } = filters;

    const cacheKey = CacheService.searchKey(JSON.stringify(filters));
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    let results: any[];

    if (lat != null && lng != null) {
      results = await this.geo.findNearby(lat, lng, radiusKm, { limit: 100, isVerified: true });
    } else {
      results = await this.textSearch(query, { limit: 100 });
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

    const total = results.length;
    const start = (page - 1) * limit;
    const paginated = results.slice(start, start + limit);

    const response = {
      businesses: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    await this.cache.set(cacheKey, response, 60);

    return response;
  }

  private async textSearch(query: string | undefined, options: { limit: number }) {
    if (!query) {
      return this.prisma.business.findMany({
        where: { isVerified: true, isActive: true },
        include: {
          services: { where: { isActive: true }, select: { id: true, name: true, category: true, basePrice: true } },
        },
        take: options.limit,
        orderBy: { rating: 'desc' },
      });
    }

    return this.prisma.business.findMany({
      where: {
        isVerified: true,
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { city: { contains: query, mode: 'insensitive' } },
          { state: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        services: { where: { isActive: true }, select: { id: true, name: true, category: true, basePrice: true } },
      },
      take: options.limit,
      orderBy: { rating: 'desc' },
    });
  }
}
