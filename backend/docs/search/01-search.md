# Search Module Scaffold

## Purpose
Geo + text search for businesses. Public endpoint, no auth required.
Uses Haversine distance + Postgres full-text search (pg_trgm). Results cached 60s.

## Files to create:
- `src/search/search.module.ts`
- `src/search/search.controller.ts`
- `src/search/search.service.ts`
- `src/search/search.service.spec.ts`

---

## `src/search/search.service.ts`

```typescript
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

    // Build cache key
    const cacheKey = this.cache.buildSearchKey(filters);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    let results: any[];

    if (lat != null && lng != null) {
      // Geo search with Haversine
      results = await this.geo.findNearby(lat, lng, radiusKm, { limit: 100, isVerified: true });
    } else {
      // Text-only search
      results = await this.textSearch(query, { limit: 100 });
    }

    // Apply filters
    if (service) {
      results = results.filter((b) =>
        b.services?.some((s: any) => s.category === service && s.isActive),
      );
    }

    if (minRating != null) {
      results = results.filter((b) => b.rating >= minRating);
    }

    // Sort
    if (sort === 'rating') {
      results.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'price') {
      results.sort((a: any, b: any) => (a.startingPriceCents || 0) - (b.startingPriceCents || 0));
    }
    // distance is already sorted by Haversine

    // Paginate
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

    // Cache 60s
    await this.cache.set(cacheKey, response, 60);

    return response;
  }

  private async textSearch(query: string | undefined, options: { limit: number }) {
    if (!query) {
      return this.prisma.business.findMany({
        where: { isVerified: true, isActive: true },
        include: {
          services: { where: { isActive: true }, select: { id: true, name: true, category: true, basePriceCents: true } },
        },
        take: options.limit,
        orderBy: { rating: 'desc' },
      });
    }

    // Use Prisma's contains for text search (pg_trgm not available without raw SQL extension)
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
        services: { where: { isActive: true }, select: { id: true, name: true, category: true, basePriceCents: true } },
      },
      take: options.limit,
      orderBy: { rating: 'desc' },
    });
  }
}
```

---

## `src/search/search.controller.ts`

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('businesses')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('query') query?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('service') service?: string,
    @Query('minRating') minRating?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.search({
      query,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
      service,
      minRating: minRating ? parseFloat(minRating) : undefined,
      sort: sort as any,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }
}
```

---

## `src/search/search.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { PrismaModule } from '../libs/prisma/prisma.module';
import { CacheModule } from '../libs/cache/cache.module';
import { GeoModule } from '../libs/geo/geo.module';

@Module({
  imports: [PrismaModule, CacheModule, GeoModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
```

---

## `src/search/search.service.spec.ts`

Tests:
1. search returns cached results when available
2. search queries verified+active businesses
3. search filters by service category
4. search filters by minimum rating
5. search sorts by distance when lat/lng provided
6. search sorts by rating when sort=rating
7. search paginates results correctly
8. search with no query returns all verified businesses
9. search caches results for 60s
