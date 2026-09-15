import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehicleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(customerId: string) {
    return this.prisma.vehicle.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(customerId: string, dto: CreateVehicleDto) {
    const existing = await this.prisma.vehicle.findUnique({
      where: {
        customerId_licensePlate: {
          customerId,
          licensePlate: dto.licensePlate,
        },
      },
    });

    if (existing) {
      throw new ConflictException('A vehicle with this license plate already exists');
    }

    return this.prisma.vehicle.create({
      data: {
        customerId,
        make: dto.make,
        model: dto.model,
        year: dto.year,
        type: dto.type as any,
        size: dto.size as any,
        color: dto.color,
        licensePlate: dto.licensePlate,
      },
    });
  }

  async update(customerId: string, vehicleId: string, dto: UpdateVehicleDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, customerId },
    });

    if (!vehicle) throw new NotFoundException('Vehicle not found');

    if (dto.licensePlate && dto.licensePlate !== vehicle.licensePlate) {
      const duplicate = await this.prisma.vehicle.findUnique({
        where: {
          customerId_licensePlate: {
            customerId,
            licensePlate: dto.licensePlate,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException('A vehicle with this license plate already exists');
      }
    }

    const updateData: any = { ...dto };
    if (dto.type) updateData.type = dto.type;
    if (dto.size) updateData.size = dto.size;

    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: updateData,
    });
  }

  async remove(customerId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, customerId },
    });

    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const futureBookings = await this.prisma.booking.count({
      where: {
        vehicleId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        date: { gte: new Date() },
      },
    });

    if (futureBookings > 0) {
      throw new ConflictException({
        code: 'HAS_FUTURE_BOOKINGS',
        message: `Cannot delete vehicle with ${futureBookings} future bookings. Cancel or complete them first.`,
      });
    }

    return this.prisma.vehicle.delete({
      where: { id: vehicleId },
    });
  }
}
