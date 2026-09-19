import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const OWN_PROPS = new Set([
  'constructor', 'onModuleInit', 'onModuleDestroy', '_client', 'logger',
]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Prisma');
  private _client: PrismaClient;

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
    this._client = this;

    return new Proxy(this, {
      get(target, prop: string | symbol, receiver) {
        if (OWN_PROPS.has(prop as string)) {
          return Reflect.get(target, prop, receiver);
        }
        const value = target._client[prop as keyof PrismaClient];
        if (typeof value === 'function') {
          return (value as Function).bind(target._client);
        }
        return value;
      },
    });
  }

  async onModuleInit() {
    try {
      await this._client.$connect();
      this.logger.log('PostgreSQL connected via pooler');
    } catch (error: any) {
      if (error?.code === 'P1001' && process.env.DIRECT_URL) {
        this.logger.warn('Pooler unreachable — falling back to direct connection...');
        await this._client.$disconnect().catch(() => {});
        this._client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
        });
        try {
          await this._client.$connect();
          this.logger.log('PostgreSQL connected via direct connection');
        } catch {
          this.logger.warn('Direct connection also failed — running in degraded mode');
        }
      } else {
        this.logger.warn('PostgreSQL unreachable — running in degraded mode');
      }
    }
  }

  async onModuleDestroy() {
    await this._client.$disconnect();
    this.logger.log('PostgreSQL disconnected');
  }

  async retryOnTransientError<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    delayMs = 500,
  ): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const isTransient =
          error?.code === '26000' || // prepared statement does not exist
          error?.code === '08000' || // connection_exception
          error?.code === '08003' || // connection does not exist
          error?.code === '08006' || // connection failure
          error?.message?.includes('ECONNRESET') ||
          error?.message?.includes('forcibly closed');
        if (isTransient && attempt < maxRetries - 1) {
          this.logger.warn(`Transient DB error (attempt ${attempt + 1}/${maxRetries}), retrying...`);
          await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }
}
