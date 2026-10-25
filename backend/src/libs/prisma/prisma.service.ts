import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const OWN_PROPS = new Set([
  'constructor',
  'onModuleInit',
  'onModuleDestroy',
  '_client',
  'logger',
  'connected',
  'recoveryTimer',
]);

const CONNECT_ATTEMPTS = 6;
const CONNECT_BASE_DELAY_MS = 1_000;
const RECOVERY_INTERVAL_MS = 15_000;

const logConfig = () => ({
  log: (process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']) as any,
});

function buildClient(useDirectUrl: boolean): PrismaClient {
  const directUrl = process.env.DIRECT_URL;
  if (useDirectUrl && directUrl) {
    return new PrismaClient({
      ...logConfig(),
      datasources: { db: { url: directUrl } },
    });
  }
  return new PrismaClient(logConfig());
}

function isReachabilityError(error: any): boolean {
  return (
    error?.code === 'P1001' ||
    error?.code === 'P1002' ||
    error?.code === 'P1008' ||
    error?.code === 'P1017' ||
    /can'?t reach database server/i.test(String(error?.message ?? ''))
  );
}

async function connectWithRetry(
  client: PrismaClient,
  label: string,
  logger: Logger,
): Promise<boolean> {
  for (let attempt = 1; attempt <= CONNECT_ATTEMPTS; attempt++) {
    try {
      await client.$connect();
      logger.log(`PostgreSQL connected via ${label}`);
      return true;
    } catch (error: any) {
      const retryable = isReachabilityError(error);
      logger.warn(
        `PostgreSQL ${label} connect attempt ${attempt}/${CONNECT_ATTEMPTS} failed: ${error?.message ?? error}`,
      );
      if (!retryable || attempt === CONNECT_ATTEMPTS) {
        return false;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, CONNECT_BASE_DELAY_MS * attempt),
      );
    }
  }
  return false;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Prisma');
  private _client: PrismaClient;
  private connected = false;
  private recoveryTimer: NodeJS.Timeout | null = null;

  constructor() {
    super(logConfig());
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
    const pooled = await connectWithRetry(this._client, 'pooler', this.logger);
    if (pooled) {
      this.connected = true;
      return;
    }

    if (process.env.DIRECT_URL) {
      this.logger.warn('Pooler unreachable — falling back to direct connection...');
      await this._client.$disconnect().catch(() => {});
      this._client = buildClient(true);

      const direct = await connectWithRetry(this._client, 'direct connection', this.logger);
      if (direct) {
        this.connected = true;
        return;
      }
    }

    this.logger.warn('PostgreSQL unreachable — running in degraded mode, will keep retrying in background');
    this.scheduleRecovery();
  }

  async onModuleDestroy() {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
      this.recoveryTimer = null;
    }
    await this._client.$disconnect();
    this.logger.log('PostgreSQL disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  private scheduleRecovery(): void {
    if (this.recoveryTimer) {
      return;
    }

    this.recoveryTimer = setInterval(async () => {
      try {
        await this._client.$connect();
        this.connected = true;
        if (this.recoveryTimer) {
          clearInterval(this.recoveryTimer);
          this.recoveryTimer = null;
        }
        this.logger.log('PostgreSQL recovered — connection restored');
      } catch (error: any) {
        this.logger.warn(`PostgreSQL still unreachable: ${error?.message ?? error}`);
      }
    }, RECOVERY_INTERVAL_MS);

    this.recoveryTimer.unref?.();
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
          error?.code === 'P1001' || // can't reach database server
          error?.code === 'P1017' || // server closed the connection
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
