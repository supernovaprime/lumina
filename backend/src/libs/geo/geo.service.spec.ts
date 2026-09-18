import { Test, TestingModule } from '@nestjs/testing';
import { GeoService } from './geo.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GeoService', () => {
  let service: GeoService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $queryRawUnsafe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<GeoService>(GeoService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('haversineDistance', () => {
    it('returns 0 for same point', () => {
      const result = service.haversineDistance(
        { latitude: 40.7128, longitude: -74.0060 },
        { latitude: 40.7128, longitude: -74.0060 },
      );
      expect(result).toBe(0);
    });

    it('returns ~111km for 1 degree latitude difference', () => {
      const result = service.haversineDistance(
        { latitude: 0, longitude: 0 },
        { latitude: 1, longitude: 0 },
      );
      expect(result).toBeCloseTo(111, 0);
    });

    it('returns correct distance for known cities', () => {
      const result = service.haversineDistance(
        { latitude: 40.7128, longitude: -74.0060 },
        { latitude: 34.0522, longitude: -118.2437 },
      );
      expect(result).toBeGreaterThan(3900);
      expect(result).toBeLessThan(4000);
    });
  });

  describe('geocode', () => {
    it('returns GeocodedAddress for valid address', async () => {
      const result = await service.geocode('New York, NY');
      if (result) {
        expect(result).toHaveProperty('latitude');
        expect(result).toHaveProperty('longitude');
        expect(result).toHaveProperty('displayName');
      }
    });

    it('returns null for empty results', async () => {
      const result = await service.geocode('xyznonexistentplace12345');
      expect(result).toBeNull();
    });
  });

  describe('findNearby', () => {
    it('uses PostGIS ST_DWithin for spatial queries', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([
        { id: 'b1', name: 'Test', distanceKm: 5000 },
      ]);

      const result = await service.findNearby(40.7128, -74.0060, 10);

      expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
      const sql = prisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('ST_DWithin');
      expect(sql).toContain('ST_SetSRID');
      expect(sql).toContain('geography');
      expect(result.businesses).toHaveLength(1);
      expect(result.businesses[0].distanceKm).toBe(5);
    });

    it('converts meters to kilometers in result', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([
        { id: 'b1', name: 'Test', distanceKm: 1500 },
      ]);

      const result = await service.findNearby(40.7128, -74.0060, 10);
      expect(result.businesses[0].distanceKm).toBe(1.5);
    });

    it('returns empty when no results', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      const result = await service.findNearby(40.7128, -74.0060, 10);
      expect(result.businesses).toEqual([]);
      expect(result.nextCursor).toBeUndefined();
    });

    it('returns nextCursor when more results exist', async () => {
      const rows = Array.from({ length: 21 }, (_, i) => ({
        id: `b${String(i).padStart(3, '0')}`,
        name: `Business ${i}`,
        distanceKm: i * 1000,
      }));
      prisma.$queryRawUnsafe.mockResolvedValue(rows);

      const result = await service.findNearby(40.7128, -74.0060, 10, { limit: 20 });
      expect(result.businesses).toHaveLength(20);
      expect(result.nextCursor).toBe('b019');
    });

    it('returns no nextCursor when all results fit', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([
        { id: 'b1', name: 'Test', distanceKm: 5000 },
      ]);

      const result = await service.findNearby(40.7128, -74.0060, 10, { limit: 20 });
      expect(result.nextCursor).toBeUndefined();
    });

    it('applies cursor for pagination', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.findNearby(40.7128, -74.0060, 10, { cursor: 'b005' });

      const sql = prisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('b."id" >');
    });

    it('applies verified filter when isVerified is true', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.findNearby(40.7128, -74.0060, 10, { isVerified: true });

      const sql = prisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('b."isVerified" = true');
      expect(sql).toContain('b."isActive" = true');
    });

    it('falls back to Haversine when PostGIS fails', async () => {
      prisma.$queryRawUnsafe
        .mockRejectedValueOnce(new Error('function st_dwithin does not exist'))
        .mockResolvedValueOnce([
          { id: 'b1', name: 'Test', distanceKm: 5.5 },
        ]);

      const result = await service.findNearby(40.7128, -74.0060, 10);
      expect(result.businesses).toHaveLength(1);
      expect(result.businesses[0].distanceKm).toBe(5.5);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
    });

    it('fallback uses Haversine formula', async () => {
      prisma.$queryRawUnsafe
        .mockRejectedValueOnce(new Error('PostGIS not available'))
        .mockResolvedValueOnce([
          { id: 'b1', name: 'Test', distanceKm: 3.2 },
        ]);

      await service.findNearby(40.7128, -74.0060, 10);

      const fallbackSql = prisma.$queryRawUnsafe.mock.calls[1][0];
      expect(fallbackSql).toContain('acos');
      expect(fallbackSql).toContain('radians');
    });

    it('fallback returns cursor when more results exist', async () => {
      const rows = Array.from({ length: 21 }, (_, i) => ({
        id: `b${String(i).padStart(3, '0')}`,
        distanceKm: i * 0.5,
      }));
      prisma.$queryRawUnsafe
        .mockRejectedValueOnce(new Error('PostGIS not available'))
        .mockResolvedValueOnce(rows);

      const result = await service.findNearby(40.7128, -74.0060, 10, { limit: 20 });
      expect(result.nextCursor).toBe('b019');
    });
  });
});
