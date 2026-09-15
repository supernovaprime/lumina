import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { PrismaModule } from '../libs/prisma/prisma.module';
import { CacheModule } from '../libs/cache/cache.module';
import { IdempotencyModule } from '../libs/idempotency/idempotency.module';
import { MoneyModule } from '../libs/money/money.module';
import { TimeModule } from '../libs/time/time.module';

@Module({
  imports: [PrismaModule, CacheModule, IdempotencyModule, MoneyModule, TimeModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
