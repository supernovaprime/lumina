import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { promises as dnsPromises } from "node:dns";

const OWN_PROPS = new Set([
  "constructor",
  "onModuleInit",
  "onModuleDestroy",
  "_client",
  "logger",
  "connected",
  "recoveryTimer",
  "keepAliveTimer",
  "isConnected",
  "retryOnTransientError",
  "scheduleRecovery",
  "startKeepAlive",
]);

const CONNECT_ATTEMPTS = 6;
const CONNECT_BASE_DELAY_MS = 1_000;
const RECOVERY_INTERVAL_MS = 15_000;

const eventLogConfig = () => ({
  log: [
    { emit: "event", level: "error" },
    { emit: "event", level: "warn" },
  ] as any,
});

const CONNECTION_RESET_LOG =
  /connectionreset|forcibly closed|error in postgresql connection|kind:\s*io|econnreset|10054/i;

const SLOW_QUERY_DEFAULT_MS = 2000;
const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000;

const SUPABASE_POOLER_HOST = /\.pooler\.supabase\.com$/i;

/**
 * Supabase's pooler rejects clients that omit TLS and performs badly when the
 * Prisma pool is too small or has no timeouts. Normalize the URL at runtime so
 * a stale .env cannot silently reintroduce those defaults.
 */
function normalizeDatabaseUrl(
  url: string | undefined,
  mode: "pooler" | "direct",
): string | undefined {
  const parsed = parsedDatabaseUrl(url);
  if (!parsed) return url;

  if (!parsed.searchParams.has("sslmode")) {
    parsed.searchParams.set("sslmode", "require");
  }

  if (SUPABASE_POOLER_HOST.test(parsed.hostname)) {
    if (mode === "pooler") {
      parsed.searchParams.set("pgbouncer", "true");
      if (!parsed.searchParams.has("connection_limit")) {
        parsed.searchParams.set("connection_limit", "10");
      }
      if (!parsed.searchParams.has("pool_timeout")) {
        parsed.searchParams.set("pool_timeout", "20");
      }
      if (!parsed.searchParams.has("connect_timeout")) {
        parsed.searchParams.set("connect_timeout", "15");
      }
    } else {
      if (!parsed.searchParams.has("connection_limit")) {
        parsed.searchParams.set("connection_limit", "2");
      }
      if (!parsed.searchParams.has("connect_timeout")) {
        parsed.searchParams.set("connect_timeout", "15");
      }
    }
  }

  return parsed.toString();
}

function prismaClientOptions(url: string | undefined) {
  return url
    ? { ...eventLogConfig(), datasources: { db: { url } } }
    : eventLogConfig();
}

function firstLine(value: unknown): string {
  return (
    String(value ?? "")
      .split("\n")
      .find((line) => line.trim().length > 0) ?? ""
  );
}

function lastLine(value: unknown): string {
  const lines = String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[lines.length - 1] ?? "";
}

/**
 * Prisma puts the code frame first and the useful cause on the last line, e.g.
 * "Invalid `prisma.user.findUnique()` invocation ... Can't reach database ...".
 * Logging only the first line hides exactly the part needed to diagnose it.
 */
function describeError(error: any): string {
  const first = firstLine(error?.message);
  const last = lastLine(error?.message);
  return last && last !== first ? `${first} — ${last}` : first;
}

function errorCode(error: any): string {
  return error?.code ? String(error.code) : "no-code";
}

function parsedDatabaseUrl(url: string | undefined): URL | null {
  if (!url) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function databaseHost(url: string | undefined): string | null {
  return parsedDatabaseUrl(url)?.hostname ?? null;
}

/**
 * Credential-free description of a connection target, safe to log.
 */
function describeDatabaseUrl(url: string | undefined, name: string): string {
  const parsed = parsedDatabaseUrl(url);
  if (!parsed) return `${name}=<missing or invalid>`;

  const params = [
    "sslmode",
    "pgbouncer",
    "connection_limit",
    "connect_timeout",
    "pool_timeout",
  ]
    .filter((key) => parsed.searchParams.has(key))
    .map((key) => `${key}=${parsed.searchParams.get(key)}`)
    .join(",");

  return `${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}${
    params ? ` (${params})` : ""
  }`;
}

async function logDnsResolution(
  url: string | undefined,
  logger: Logger,
): Promise<void> {
  const host = databaseHost(url);
  if (!host) return;

  try {
    const addresses = await dnsPromises.lookup(host, { all: true });
    logger.warn(
      `DNS ${host} resolves to ${addresses
        .map((entry) => `${entry.address} (IPv${entry.family})`)
        .join(", ")}`,
    );
  } catch (error: any) {
    logger.warn(
      `DNS lookup for ${host} failed [${errorCode(error)}]: ${firstLine(error?.message)}`,
    );
  }
}

/**
 * The Supabase pooler recycles idle sockets, so the driver periodically reports
 * a reset while transparently reconnecting. Those messages are not actionable
 * and used to flood `prisma:error`; surface them at debug instead.
 */
function attachLogListeners(client: PrismaClient, logger: Logger): void {
  try {
    (client as any).$on("error", (event: any) => {
      const message = String(event?.message ?? event);
      const suffix = [
        event?.code ? `code=${event.code}` : null,
        event?.target ? `target=${event.target}` : null,
      ]
        .filter(Boolean)
        .join(" ");

      if (CONNECTION_RESET_LOG.test(message)) {
        logger.debug(
          `PostgreSQL pooler reset an idle connection — engine will reconnect${
            suffix ? ` (${suffix})` : ""
          }`,
        );
        return;
      }
      logger.error(`Prisma error${suffix ? ` (${suffix})` : ""}: ${message}`);
    });
    (client as any).$on("warn", (event: any) => {
      logger.warn(`Prisma warning: ${String(event?.message ?? event)}`);
    });
  } catch (error: any) {
    logger.warn(
      `Unable to attach Prisma log listeners: ${error?.message ?? error}`,
    );
  }
}

const RETRYABLE_READ = /^(find|count|aggregate|groupBy)/;

/**
 * Supabase recycles idle pooler sockets, so the first query after a quiet
 * period can surface P1001/P1002/P1008. One short retry usually recovers the
 * request; three full connection attempts only stall login for ~20s. Auth and
 * configuration errors (P1000/P1003/P1010) never improve on retry, so they are
 * surfaced immediately and the exception filter answers with a 503.
 */
const QUERY_NO_RETRY_CODES = new Set([
  "P1000", // authentication failed
  "P1003", // database does not exist
  "P1010", // user authentication failed
  "P2024", // pool timeout — retrying immediately makes contention worse
  "P2037", // too many connections
]);
const QUERY_SINGLE_RETRY_CODES = new Set([
  "P1001", // can't reach database server
  "P1002", // database server timeout
  "P1008", // operation timed out
  "P1017", // server closed the connection
]);

function isRetryableQueryError(error: any): boolean {
  if (error?.code && QUERY_NO_RETRY_CODES.has(error.code)) {
    return false;
  }
  return isTransientDbError(error);
}

function queryAttemptBudget(error: any, attempts: number): number {
  if (!error?.code) return attempts;
  if (QUERY_NO_RETRY_CODES.has(error.code)) return 1;
  if (QUERY_SINGLE_RETRY_CODES.has(error.code)) {
    return Math.min(attempts, 2);
  }
  return attempts;
}

async function retryTransientQuery<T>(
  fn: () => Promise<T>,
  attempts: number,
  delayMs: number,
  context: string,
  logger: Logger,
  slowQueryMs: number,
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const started = Date.now();
    try {
      const result = await fn();
      const elapsed = Date.now() - started;
      if (elapsed >= slowQueryMs) {
        logger.warn(`Slow Prisma query ${context} completed in ${elapsed}ms`);
      }
      return result;
    } catch (error: any) {
      lastError = error;
      const elapsed = Date.now() - started;
      const retryable = isRetryableQueryError(error);
      const budget = queryAttemptBudget(error, attempts);

      if (!retryable || attempt === budget - 1) {
        logger.debug(
          `Prisma query ${context} failed after ${elapsed}ms [${errorCode(
            error,
          )}] (${attempt + 1}/${budget} attempt${
            budget === 1 ? "" : "s"
          }${retryable ? "" : ", not retryable"}): ${describeError(error)}`,
        );
        throw error;
      }

      const delay = delayMs * (attempt + 1) + Math.floor(Math.random() * 250);
      logger.warn(
        `Prisma query ${context} attempt ${attempt + 1}/${budget} failed in ${elapsed}ms [${errorCode(
          error,
        )}]: ${describeError(error)} — retrying in ${delay}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * Retries only reads; writes are left untouched because a reset can happen
 * after the statement was applied, and replaying it would duplicate rows.
 */
function withQueryRetry(client: PrismaClient, logger: Logger): PrismaClient {
  const slowQueryMs =
    Number.parseInt(process.env.PRISMA_SLOW_QUERY_MS ?? "", 10) ||
    SLOW_QUERY_DEFAULT_MS;

  const extended = client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const context = `${model ?? "raw"}.${operation}`;
          const attempts = RETRYABLE_READ.test(operation) ? 2 : 1;
          return retryTransientQuery(
            () => query(args),
            attempts,
            600,
            context,
            logger,
            slowQueryMs,
          );
        },
      },
    },
  });
  return extended as unknown as PrismaClient;
}

function buildClient(useDirectUrl: boolean, logger: Logger): PrismaClient {
  const directUrl = normalizeDatabaseUrl(process.env.DIRECT_URL, "direct");
  const pooledUrl = normalizeDatabaseUrl(process.env.DATABASE_URL, "pooler");
  const targetUrl = useDirectUrl ? directUrl : pooledUrl;
  const targetLabel = useDirectUrl ? "DIRECT_URL" : "DATABASE_URL";

  logger.log(
    `Creating Prisma client for ${describeDatabaseUrl(targetUrl, targetLabel)}`,
  );

  const base = new PrismaClient(prismaClientOptions(targetUrl));
  attachLogListeners(base, logger);
  return withQueryRetry(base, logger);
}

function isReachabilityError(error: any): boolean {
  return (
    error?.code === "P1001" ||
    error?.code === "P1002" ||
    error?.code === "P1008" ||
    error?.code === "P1017" ||
    /can'?t reach database server/i.test(String(error?.message ?? ""))
  );
}

const TRANSIENT_DB_CODES = new Set([
  "26000", // prepared statement does not exist
  "08000", // connection_exception
  "08003", // connection does not exist
  "08006", // connection failure
  "P1001", // can't reach database server
  "P1002", // database server timeout
  "P1008", // operation timed out
  "P1017", // server closed the connection
  "P2024", // connection pool timeout
  "P2037", // too many connections
]);

const TRANSIENT_DB_MESSAGE =
  /can'?t reach database server|connection (?:terminated|closed|lost|refused|timeout)|econnreset|econnrefused|forcibly closed|timed out|server has closed the connection|too many connections|connection pool/i;

function isTransientDbError(error: any): boolean {
  if (error?.code && TRANSIENT_DB_CODES.has(error.code)) {
    return true;
  }
  return TRANSIENT_DB_MESSAGE.test(String(error?.message ?? ""));
}

async function connectWithRetry(
  client: PrismaClient,
  label: string,
  url: string | undefined,
  logger: Logger,
): Promise<boolean> {
  const target = describeDatabaseUrl(url, label);

  for (let attempt = 1; attempt <= CONNECT_ATTEMPTS; attempt++) {
    const started = Date.now();
    try {
      await client.$connect();
      logger.log(
        `PostgreSQL connected via ${label} (${target}) in ${Date.now() - started}ms`,
      );
      return true;
    } catch (error: any) {
      const elapsed = Date.now() - started;
      const retryable = isReachabilityError(error);
      const delay =
        retryable && attempt < CONNECT_ATTEMPTS
          ? CONNECT_BASE_DELAY_MS * attempt
          : 0;

      logger.warn(
        `PostgreSQL ${label} connect attempt ${attempt}/${CONNECT_ATTEMPTS} failed in ${elapsed}ms [${errorCode(
          error,
        )}] ${target}: ${describeError(error)}${
          delay ? ` — retrying in ${delay}ms` : ""
        }`,
      );

      if (!retryable || attempt === CONNECT_ATTEMPTS) {
        if (/can'?t reach|connection/i.test(String(error?.message ?? ""))) {
          await logDnsResolution(url, logger);
          logger.warn(
            "PostgreSQL is unreachable. Check the Supabase project status (paused projects reject connections), network egress/IP allowlists, and that the pooler host/region matches the project.",
          );
        }
        return false;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return false;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger("Prisma");
  private _client: PrismaClient;
  private connected = false;
  private recoveryTimer: NodeJS.Timeout | null = null;
  private keepAliveTimer: NodeJS.Timeout | null = null;

  constructor() {
    super(
      prismaClientOptions(
        normalizeDatabaseUrl(process.env.DATABASE_URL, "pooler"),
      ),
    );
    attachLogListeners(this, this.logger);
    this._client = withQueryRetry(this, this.logger);

    return new Proxy(this, {
      get(target, prop: string | symbol, receiver) {
        if (OWN_PROPS.has(prop as string)) {
          return Reflect.get(target, prop, receiver);
        }
        const value = target._client[prop as keyof PrismaClient];
        if (typeof value === "function") {
          return (value as Function).bind(target._client);
        }
        return value;
      },
    });
  }

  async onModuleInit() {
    const pooledUrl = normalizeDatabaseUrl(process.env.DATABASE_URL, "pooler");
    const directUrl = normalizeDatabaseUrl(process.env.DIRECT_URL, "direct");

    this.logger.log(
      `PostgreSQL pooled target: ${describeDatabaseUrl(pooledUrl, "DATABASE_URL")}`,
    );
    if (directUrl) {
      this.logger.log(
        `PostgreSQL direct fallback: ${describeDatabaseUrl(directUrl, "DIRECT_URL")}`,
      );
    }

    const pooled = await connectWithRetry(
      this._client,
      "pooler",
      pooledUrl,
      this.logger,
    );
    if (pooled) {
      this.connected = true;
      this.startKeepAlive();
      return;
    }

    if (directUrl) {
      this.logger.warn(
        `Pooler unreachable — falling back to direct connection ${describeDatabaseUrl(
          directUrl,
          "DIRECT_URL",
        )}`,
      );
      await this._client.$disconnect().catch(() => {});
      this._client = buildClient(true, this.logger);

      const direct = await connectWithRetry(
        this._client,
        "direct connection",
        directUrl,
        this.logger,
      );
      if (direct) {
        this.connected = true;
        this.startKeepAlive();
        return;
      }
    }

    this.logger.warn(
      "PostgreSQL unreachable — running in degraded mode. Background recovery probes every 15s; API requests will return 503 until connectivity returns.",
    );
    this.scheduleRecovery();
  }

  async onModuleDestroy() {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
      this.recoveryTimer = null;
    }
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    await this._client.$disconnect();
    this.logger.log("PostgreSQL disconnected");
  }

  private startKeepAlive(): void {
    if (this.keepAliveTimer || process.env.NODE_ENV === "test") return;

    // Supabase recycles idle pooler sockets. A cheap periodic query keeps at
    // least one warm connection and avoids the first request after quiet
    // periods paying for a full TCP/TLS reconnect.
    this.keepAliveTimer = setInterval(() => {
      this._client.$queryRawUnsafe("SELECT 1").catch((error: any) => {
        this.logger.debug(
          `PostgreSQL keepalive failed: ${describeError(error)}`,
        );
        if (isReachabilityError(error)) {
          this.connected = false;
          this.scheduleRecovery();
        }
      });
    }, KEEPALIVE_INTERVAL_MS);
    this.keepAliveTimer.unref?.();
  }

  isConnected(): boolean {
    return this.connected;
  }

  private scheduleRecovery(): void {
    if (this.recoveryTimer) {
      return;
    }

    this.recoveryTimer = setInterval(async () => {
      const started = Date.now();
      try {
        await this._client.$connect();
        this.connected = true;
        if (this.recoveryTimer) {
          clearInterval(this.recoveryTimer);
          this.recoveryTimer = null;
        }
        this.startKeepAlive();
        this.logger.log(
          `PostgreSQL recovered — connection restored after ${Date.now() - started}ms`,
        );
      } catch (error: any) {
        this.logger.warn(
          `PostgreSQL still unreachable [${errorCode(
            error,
          )}] after ${Date.now() - started}ms: ${describeError(error)}`,
        );
      }
    }, RECOVERY_INTERVAL_MS);

    this.recoveryTimer.unref?.();
  }

  async retryOnTransientError<T>(
    fn: () => Promise<T>,
    maxRetries = 2,
    delayMs = 500,
  ): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const underLoad = error?.code === "P2024" || error?.code === "P2037";
        const isTransient = isTransientDbError(error);
        if (isTransient && !underLoad && attempt < maxRetries - 1) {
          const delay =
            delayMs * (attempt + 1) + Math.floor(Math.random() * 250);
          this.logger.warn(
            `Transient DB error [${errorCode(
              error,
            )}] (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms: ${describeError(
              error,
            )}`,
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }
}
