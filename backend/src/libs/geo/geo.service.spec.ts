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
      // NYC to LA ~ 3944km
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
    it('queries with correct parameters', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      await service.findNearby(40.7128, -74.0060, 10);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('returns empty array when no results', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      const result = await service.findNearby(40.7128, -74.0060, 10);
      expect(result).toEqual([]);
    });

    it('attaches distanceKm to results', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([
        { id: 'b1', name: 'Test', distanceKm: '5.5' },
      ]);
      const result = await service.findNearby(40.7128, -74.0060, 10);
      expect(result[0].distanceKm).toBe(5.5);
    });
  });
});
