import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './libs/prisma/prisma.module';
import { RedisModule } from './libs/redis/redis.module';
import { CacheModule } from './libs/cache/cache.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { BusinessModule } from './business/business.module';
import { BookingModule } from './booking/booking.module';
import { PaymentModule } from './payment/payment.module';
import { ReviewModule } from './review/review.module';
import { CustomerModule } from './customer/customer.module';
import { SearchModule } from './search/search.module';
import { NotificationModule } from './notification/notification.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 10,
      },
    ]),

    // Core infrastructure
    PrismaModule,
    RedisModule,
    CacheModule,

    // Feature modules
    AuthModule,
    AdminModule,
    BusinessModule,
    BookingModule,
    PaymentModule,
    ReviewModule,
    CustomerModule,
    SearchModule,
    NotificationModule,
    WebhooksModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Add any global middleware here if needed
  }
}
