import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'not_configured';

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  message: string;
  latencyMs?: number;
}

export interface HealthReport {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptime: number;
  services: ServiceHealth[];
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async checkAll(): Promise<HealthReport> {
    const services = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkMailgun(),
      this.checkMNotify(),
      this.checkStripe(),
      this.checkSupabaseStorage(),
      this.checkSentry(),
      this.checkGeocoding(),
      this.checkJwt(),
    ]);

    const downCount = services.filter((s) => s.status === 'down').length;
    const degradedCount = services.filter((s) => s.status === 'degraded').length;

    let overall: 'ok' | 'degraded' | 'down' = 'ok';
    if (downCount > 0) overall = 'down';
    else if (degradedCount > 0) overall = 'degraded';

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
    };
  }

  async checkPostgres(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return {
        name: 'PostgreSQL',
        status: 'healthy',
        message: 'Connected',
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        name: 'PostgreSQL',
        status: 'down',
        message: err?.message || 'Connection failed',
        latencyMs: Date.now() - start,
      };
    }
  }

  async checkRedis(): Promise<ServiceHealth> {
    const client = this.redis.getClient();
    if (!client) {
      return {
        name: 'Redis',
        status: 'not_configured',
        message: 'REDIS_URL not set',
      };
    }
    const start = Date.now();
    try {
      const pong = await client.ping();
      return {
        name: 'Redis',
        status: pong === 'PONG' ? 'healthy' : 'degraded',
        message: pong === 'PONG' ? 'Connected' : `Unexpected response: ${pong}`,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        name: 'Redis',
        status: 'down',
        message: err?.message || 'Connection failed',
        latencyMs: Date.now() - start,
      };
    }
  }

  checkMailgun(): ServiceHealth {
    const apiKey = this.config.get<string>('MAILGUN_API_KEY', '');
    const domain = this.config.get<string>('MAILGUN_DOMAIN', '');
    if (!apiKey || !domain) {
      return {
        name: 'Mailgun',
        status: 'not_configured',
        message: !apiKey ? 'MAILGUN_API_KEY missing' : 'MAILGUN_DOMAIN missing',
      };
    }
    return {
      name: 'Mailgun',
      status: 'healthy',
      message: `Configured (domain: ${domain})`,
    };
  }

  checkMNotify(): ServiceHealth {
    const apiKey = this.config.get<string>('MNOTIFY_API_KEY', '');
    if (!apiKey) {
      return {
        name: 'MNotify',
        status: 'not_configured',
        message: 'MNOTIFY_API_KEY missing',
      };
    }
    return {
      name: 'MNotify',
      status: 'healthy',
      message: 'Configured',
    };
  }

  checkStripe(): ServiceHealth {
    const key = this.config.get<string>('STRIPE_SECRET_KEY', '');
    if (!key) {
      return {
        name: 'Stripe',
        status: 'not_configured',
        message: 'STRIPE_SECRET_KEY missing',
      };
    }
    return {
      name: 'Stripe',
      status: 'healthy',
      message: `Configured (${key.startsWith('sk_test_') ? 'test' : 'live'} mode)`,
    };
  }

  checkSupabaseStorage(): ServiceHealth {
    const url = this.config.get<string>('SUPABASE_URL', '');
    const key = this.config.get<string>('SUPABASE_ANON_KEY', '');
    const bucket = this.config.get<string>('STORAGE_BUCKET', '');
    if (!url || !key) {
      return {
        name: 'Supabase Storage',
        status: 'not_configured',
        message: !url ? 'SUPABASE_URL missing' : 'SUPABASE_ANON_KEY missing',
      };
    }
    return {
      name: 'Supabase Storage',
      status: 'healthy',
      message: `Configured (bucket: ${bucket || 'default'})`,
    };
  }

  checkSentry(): ServiceHealth {
    const dsn = this.config.get<string>('SENTRY_DSN', '');
    if (!dsn) {
      return {
        name: 'Sentry',
        status: 'not_configured',
        message: 'SENTRY_DSN missing',
      };
    }
    return {
      name: 'Sentry',
      status: 'healthy',
      message: 'Configured',
    };
  }

  checkGeocoding(): ServiceHealth {
    const ua = this.config.get<string>('GEOCODING_USER_AGENT', '');
    if (!ua) {
      return {
        name: 'Geocoding',
        status: 'not_configured',
        message: 'GEOCODING_USER_AGENT missing',
      };
    }
    return {
      name: 'Geocoding',
      status: 'healthy',
      message: 'Nominatim/OpenStreetMap (free)',
    };
  }

  checkJwt(): ServiceHealth {
    const secret = this.config.get<string>('JWT_SECRET', '');
    if (!secret || secret === '[YOUR-JWT-SECRET]') {
      return {
        name: 'JWT',
        status: 'degraded',
        message: 'JWT_SECRET is placeholder — set a real secret',
      };
    }
    return {
      name: 'JWT',
      status: 'healthy',
      message: 'Configured',
    };
  }

  logHealthReport(report: HealthReport): void {
    const green = '\x1b[32m';
    const yellow = '\x1b[33m';
    const red = '\x1b[31m';
    const dim = '\x1b[2m';
    const bold = '\x1b[1m';
    const reset = '\x1b[0m';
    const cyan = '\x1b[36m';

    const statusColor = (s: ServiceStatus) =>
      s === 'healthy' ? green : s === 'degraded' ? yellow : s === 'down' ? red : dim;
    const statusIcon = (s: ServiceStatus) =>
      s === 'healthy' ? '✓' : s === 'degraded' ? '!' : s === 'down' ? '✗' : '—';

    console.log('');
    console.log(`${cyan}${bold}  Service Health${reset} ${dim}(${report.timestamp})${reset}`);
    console.log(`${dim}  ${'─'.repeat(50)}${reset}`);

    for (const svc of report.services) {
      const icon = statusIcon(svc.status);
      const color = statusColor(svc.status);
      const latency = svc.latencyMs !== undefined ? ` ${dim}(${svc.latencyMs}ms)${reset}` : '';
      console.log(`  ${color}${icon}${reset} ${svc.name.padEnd(20)} ${dim}${svc.message}${reset}${latency}`);
    }

    console.log(`${dim}  ${'─'.repeat(50)}${reset}`);

    const overallColor = report.status === 'ok' ? green : report.status === 'degraded' ? yellow : red;
    const overallLabel = report.status === 'ok' ? 'ALL SYSTEMS GO' : report.status === 'degraded' ? 'DEGRADED' : 'CRITICAL';
    console.log(`  ${overallColor}${bold}${overallLabel}${reset} ${dim}uptime: ${Math.floor(report.uptime)}s${reset}`);
    console.log('');
  }
}
