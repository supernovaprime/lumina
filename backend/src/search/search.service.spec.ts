import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { GeoService } from '../libs/geo/geo.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: any;
  let cache: any;
  let geo: any;

  beforeEach(async () => {
    prisma = {
      business: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      searchKey: jest.fn().mockReturnValue('search:test'),
    };

    geo = {
      findNearby: jest.fn().mockResolvedValue({ businesses: [], nextCursor: undefined }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
        { provide: GeoService, useValue: geo },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('search', () => {
    it('returns cached result when available', async () => {
      const cached = { businesses: [{ id: 'b1' }], meta: { hasMore: false, limit: 20 } };
      cache.get.mockResolvedValue(cached);

      const result = await service.search({ query: 'test' });
      expect(result).toEqual(cached);
      expect(geo.findNearby).not.toHaveBeenCalled();
      expect(prisma.business.findMany).not.toHaveBeenCalled();
    });

    it('uses geo.findNearby when lat/lng provided', async () => {
      geo.findNearby.mockResolvedValue({
        businesses: [{ id: 'b1', name: 'Wash Co', distanceKm: 2.5 }],
        nextCursor: undefined,
      });

      const result = await service.search({ lat: 40.7128, lng: -74.0060, radiusKm: 5 });
      expect(geo.findNearby).toHaveBeenCalledWith(40.7128, -74.0060, 5, {
        limit: 100,
        cursor: undefined,
        isVerified: true,
      });
      expect(result.businesses).toHaveLength(1);
      expect(result.meta.hasMore).toBe(false);
    });

    it('uses text search when no lat/lng', async () => {
      prisma.business.findMany.mockResolvedValue([
        { id: 'b1', name: 'Quick Wash', services: [] },
      ]);

      const result = await service.search({ query: 'wash' });
      expect(prisma.business.findMany).toHaveBeenCalled();
      expect(result.businesses).toHaveLength(1);
    });

    it('returns all businesses when no query and no lat/lng', async () => {
      prisma.business.findMany.mockResolvedValue([
        { id: 'b1', name: 'Wash 1', services: [] },
        { id: 'b2', name: 'Wash 2', services: [] },
      ]);

      const result = await service.search({});
      expect(result.businesses).toHaveLength(2);
    });

    it('filters by service category', async () => {
      geo.findNearby.mockResolvedValue({
        businesses: [
          { id: 'b1', name: 'Wash', services: [{ category: 'EXTERIOR', isActive: true }], rating: 4 },
          { id: 'b2', name: 'Detail', services: [{ category: 'INTERIOR', isActive: true }], rating: 4 },
        ],
        nextCursor: undefined,
      });

      const result = await service.search({
        lat: 40.7128,
        lng: -74.0060,
        service: 'EXTERIOR',
      });
      expect(result.businesses).toHaveLength(1);
      expect(result.businesses[0].id).toBe('b1');
    });

    it('filters by minimum rating', async () => {
      geo.findNearby.mockResolvedValue({
        businesses: [
          { id: 'b1', name: 'Wash', rating: 4.5, services: [] },
          { id: 'b2', name: 'Detail', rating: 3.0, services: [] },
        ],
        nextCursor: undefined,
      });

      const result = await service.search({
        lat: 40.7128,
        lng: -74.0060,
        minRating: 4,
      });
      expect(result.businesses).toHaveLength(1);
      expect(result.businesses[0].id).toBe('b1');
    });

    it('sorts by rating when sort=rating', async () => {
      geo.findNearby.mockResolvedValue({
        businesses: [
          { id: 'b1', name: 'Low', rating: 3, services: [] },
          { id: 'b2', name: 'High', rating: 5, services: [] },
        ],
        nextCursor: undefined,
      });

      const result = await service.search({
        lat: 40.7128,
        lng: -74.0060,
        sort: 'rating',
      });
      expect(result.businesses[0].id).toBe('b2');
      expect(result.businesses[1].id).toBe('b1');
    });

    it('sorts by price when sort=price', async () => {
      geo.findNearby.mockResolvedValue({
        businesses: [
          { id: 'b1', name: 'Expensive', startingPriceCents: 5000, services: [] },
          { id: 'b2', name: 'Cheap', startingPriceCents: 2000, services: [] },
        ],
        nextCursor: undefined,
      });

      const result = await service.search({
        lat: 40.7128,
        lng: -74.0060,
        sort: 'price',
      });
      expect(result.businesses[0].id).toBe('b2');
      expect(result.businesses[1].id).toBe('b1');
    });

    it('uses cursor-based pagination', async () => {
      const businesses = Array.from({ length: 25 }, (_, i) => ({
        id: `b${String(i).padStart(3, '0')}`,
        name: `Wash ${i}`,
        services: [],
        rating: 4,
      }));
      geo.findNearby.mockResolvedValue({ businesses, nextCursor: undefined });

      const result = await service.search({
        lat: 40.7128,
        lng: -74.0060,
        limit: 10,
      });
      expect(result.businesses).toHaveLength(10);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.nextCursor).toBeDefined();
    });

    it('passes cursor to geo.findNearby', async () => {
      geo.findNearby.mockResolvedValue({ businesses: [], nextCursor: undefined });

      await service.search({
        lat: 40.7128,
        lng: -74.0060,
        cursor: 'b010',
      });

      expect(geo.findNearby).toHaveBeenCalledWith(40.7128, -74.0060, 10, {
        limit: 100,
        cursor: 'b010',
        isVerified: true,
      });
    });

    it('caches the result', async () => {
      geo.findNearby.mockResolvedValue({ businesses: [], nextCursor: undefined });

      await service.search({ lat: 40.7128, lng: -74.0060 });

      expect(cache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ businesses: expect.any(Array) }),
        60,
      );
    });

    it('returns correct meta structure', async () => {
      geo.findNearby.mockResolvedValue({ businesses: [], nextCursor: undefined });

      const result = await service.search({ lat: 40.7128, lng: -74.0060 });
      expect(result).toHaveProperty('businesses');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('hasMore');
      expect(result.meta).toHaveProperty('limit');
    });
  });

  describe('textSearch', () => {
    it('searches by name, city, state, description', async () => {
      prisma.business.findMany.mockResolvedValue([]);

      await service.search({ query: 'quick' });

      const call = prisma.business.findMany.mock.calls[0][0];
      expect(call.where.OR).toHaveLength(4);
      expect(call.where.OR[0]).toEqual({ name: { contains: 'quick', mode: 'insensitive' } });
      expect(call.where.OR[1]).toEqual({ city: { contains: 'quick', mode: 'insensitive' } });
    });

    it('applies cursor to text search', async () => {
      prisma.business.findMany.mockResolvedValue([]);

      await service.search({ query: 'wash', cursor: 'b005' });

      const call = prisma.business.findMany.mock.calls[0][0];
      expect(call.where.id).toEqual({ gt: 'b005' });
    });

    it('includes active services', async () => {
      prisma.business.findMany.mockResolvedValue([]);

      await service.search({ query: 'wash' });

      const call = prisma.business.findMany.mock.calls[0][0];
      expect(call.include.services).toEqual({
        where: { isActive: true },
        select: { id: true, name: true, category: true, basePrice: true },
      });
    });
  });
});
