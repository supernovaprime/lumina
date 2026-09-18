import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { StorageService } from '../libs/storage/storage.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly storage: StorageService,
  ) {}

  async create(ownerId: string, dto: CreateBusinessDto) {
    const existing = await this.prisma.business.findUnique({
      where: { ownerId },
    });
    if (existing && existing.isActive) {
      throw new ConflictException('You already have an active business profile');
    }

    const business = await this.prisma.business.create({
      data: {
        ownerId,
        name: dto.name,
        description: dto.description,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        phone: dto.phone,
        email: dto.email,
        timezone: dto.timezone,
        logo: dto.logoUrl,
        coverImage: dto.coverUrl,
        rating: 0,
        reviewCount: 0,
        isVerified: false,
        isActive: true,
        verificationStatus: 'PENDING',
      },
    });

    return business;
  }

  async update(id: string, dto: UpdateBusinessDto) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');

    const updated = await this.prisma.business.update({
      where: { id },
      data: dto,
    });

    await this.cache.del(`business:${id}`);
    await this.cache.invalidate('search:*');

    return updated;
  }

  async findById(id: string): Promise<any> {
    const cacheKey = `business:${id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const business = await this.prisma.business.findUnique({
      where: { id, isActive: true },
      include: {
        services: { where: { isActive: true } },
        _count: { select: { reviews: true } },
      },
    });

    if (!business) throw new NotFoundException('Business not found');

    await this.cache.set(cacheKey, business, 300);
    return business;
  }

  async uploadLogo(
    id: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');

    // Delete old logo if exists
    if (business.logo) {
      await this.storage.delete(business.logo);
    }

    const ext = file.originalname.split('.').pop() || 'jpg';
    const fileName = `logo-${Date.now()}.${ext}`;
    const result = await this.storage.upload(`logos/${id}`, fileName, file.buffer, file.mimetype);

    await this.prisma.business.update({
      where: { id },
      data: { logo: result.path },
    });

    await this.cache.del(`business:${id}`);
    await this.cache.invalidate('search:*');

    return { logoUrl: result.publicUrl, path: result.path };
  }

  async uploadCover(
    id: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');

    // Delete old cover if exists
    if (business.coverImage) {
      await this.storage.delete(business.coverImage);
    }

    const ext = file.originalname.split('.').pop() || 'jpg';
    const fileName = `cover-${Date.now()}.${ext}`;
    const result = await this.storage.upload(`covers/${id}`, fileName, file.buffer, file.mimetype);

    await this.prisma.business.update({
      where: { id },
      data: { coverImage: result.path },
    });

    await this.cache.del(`business:${id}`);
    await this.cache.invalidate('search:*');

    return { coverUrl: result.publicUrl, path: result.path };
  }

  async findPublicById(id: string) {
    const cacheKey = `business:public:${id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const business = await this.prisma.business.findUnique({
      where: { id, isActive: true, isVerified: true },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        latitude: true,
        longitude: true,
        phone: true,
        email: true,
        logo: true,
        coverImage: true,
        rating: true,
        reviewCount: true,
        timezone: true,
        operatingHours: true,
        createdAt: true,
      },
    });

    if (!business) throw new NotFoundException('Business not found');

    await this.cache.set(cacheKey, business, 300);
    return business;
  }
}
