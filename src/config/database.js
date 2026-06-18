import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

// FIX #3 + #4: Pool de conexões limitado para Hostinger shared (max 10-25 conns)
// connection_limit baixo evita "Too many connections" após cold start / restart
const prisma = new PrismaClient({
  log: [{ emit: 'event', level: 'error' }, { emit: 'event', level: 'warn' }],
  errorFormat: 'minimal',
});

prisma.$on('error', (e) => logger.error('[Prisma]', e.message));
prisma.$on('warn',  (e) => logger.warn('[Prisma]', e.message));

// FIX #4: Retry com backoff exponencial
// Render free tier acorda lentamente — primeira tentativa pode falhar por timeout
// Tentativas: 2s → 4s → 8s → 16s → 32s (total ~62s de espera máxima)
export async function connectDB(retries = 5, delay = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw\`SELECT 1\`;
      await prisma.$executeRaw\`SET NAMES utf8mb4\`;
      await prisma.$executeRaw\`SET SESSION wait_timeout = 28800\`;
      logger.info('[DB] MySQL Hostinger conectado ✅');
      return;
    } catch (err) {
      logger.warn(\`[DB] Tentativa \${attempt}/\${retries} falhou: \${err.message}\`);
      if (attempt === retries) {
        logger.error('[DB] Falha definitiva ao conectar MySQL após todas as tentativas.');
        throw err;
      }
      await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt - 1)));
    }
  }
}

export async function disconnectDB() {
  await prisma.$disconnect();
}

export async function checkDB() {
  try { await prisma.$queryRaw\`SELECT 1\`; return true; } catch { return false; }
}

export { prisma };
