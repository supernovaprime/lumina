#!/usr/bin/env node
/**
 * Prisma CLI wrapper with connection fallback.
 * Tests both pooler and direct connections, then uses the best available.
 * Handles Prisma's directUrl behavior (push/migrate use directUrl, not url).
 */
require('dotenv').config();
const { execSync } = require('child_process');
const net = require('net');

function testConnection(url, timeoutMs = 3000) {
  const match = url.match(/@([^:]+):(\d+)/);
  if (!match) return Promise.resolve(true);
  const [, host, port] = match;
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error',   () => { socket.destroy(); resolve(false); });
    socket.connect(parseInt(port, 10), host);
  });
}

async function main() {
  const args = process.argv.slice(2).join(' ');
  const poolerUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;

  if (!poolerUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const poolerOk = await testConnection(poolerUrl);
  const directOk = directUrl ? await testConnection(directUrl) : false;

  // Build env: Prisma uses directUrl for push/migrate, so ensure it points to a working connection
  const env = { ...process.env };

  if (poolerOk && !directOk && directUrl) {
    console.log('Pooler OK, direct unreachable — using pooler for all connections');
    // Override both so Prisma uses pooler for url AND directUrl
    env.DATABASE_URL = poolerUrl;
    env.DIRECT_URL = poolerUrl;
  } else if (!poolerOk && directOk) {
    console.log('Direct OK, pooler unreachable — using direct for all connections');
    env.DATABASE_URL = directUrl;
    env.DIRECT_URL = directUrl;
  } else if (!poolerOk && !directOk) {
    console.error('Both pooler and direct connections unreachable');
    process.exit(1);
  } else {
    console.log('Using default connections');
  }

  execSync(`npx prisma ${args}`, { stdio: 'inherit', env });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
