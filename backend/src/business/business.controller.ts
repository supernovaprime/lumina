import {
  Controller, Get, Post, Patch, Body, Param, UseGuards, UploadedFile,
  UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

const IMAGE_FILTER = {
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_: any, file: any, cb: any) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new BadRequestException('Only JPG, PNG, WEBP allowed'), false);
    }
    cb(null, true);
  },
};

@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS')
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateBusinessDto) {
    return this.businessService.create(userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS')
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    const business = await this.businessService.findById(id);
    if (business.ownerId !== userId) {
      throw new BadRequestException('You can only update your own business');
    }
    return this.businessService.update(id, dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.businessService.findPublicById(id);
  }

  @Patch(':id/logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS')
  @UseInterceptors(FileInterceptor('file', IMAGE_FILTER))
  async uploadLogo(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const business = await this.businessService.findById(id);
    if (business.ownerId !== userId) {
      throw new BadRequestException('You can only update your own business');
    }
    return this.businessService.uploadLogo(id, file);
  }

  @Patch(':id/cover')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS')
  @UseInterceptors(FileInterceptor('file', IMAGE_FILTER))
  async uploadCover(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const business = await this.businessService.findById(id);
    if (business.ownerId !== userId) {
      throw new BadRequestException('You can only update your own business');
    }
    return this.businessService.uploadCover(id, file);
  }
}
