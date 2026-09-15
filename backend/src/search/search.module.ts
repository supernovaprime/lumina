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
