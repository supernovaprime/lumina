import { Global, Module } from '@nestjs/common';
import { GeoService } from './geo.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [GeoService],
  exports: [GeoService],
})
export class GeoModule {}
