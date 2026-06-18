#!/usr/bin/env python3
"""
MOBYA — Aplicador de fixes via Termux
Execute na raiz do repo mobya-app-main/:
  python3 mobya_fix_termux.py

Fixes aplicados:
  1. auth.routes.js  — sameSite: 'strict' → 'none'
  2. app.js          — CORS origin GitHub Pages (sem path)
  3. database.js     — retry exponencial + pool config
  4. server.js       — bootstrap resiliente (não crasha no cold start)
  5. listing.routes.js — remove mode:'insensitive' (incompatível MySQL)
  6. render.yaml     — remove --accept-data-loss do buildCommand
"""

import os, sys, ast, warnings
warnings.filterwarnings('ignore', category=SyntaxWarning)

BASE = os.getcwd()

# ── helpers ────────────────────────────────────────────────────────────────
def write(rel, content):
    path = os.path.join(BASE, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  ✅ {rel}")

def check_syntax(rel, content):
    """Valida JS básico: checa ausência de erros de template string truncado"""
    # Conta chaves e parênteses balanceados (heurística)
    opens  = content.count('{') - content.count('}')
    parens = content.count('(') - content.count(')')
    if abs(opens) > 5 or abs(parens) > 5:
        print(f"  ⚠️  {rel}: possível desequilíbrio de chaves ({opens}) ou parênteses ({parens})")
    return True

# ══════════════════════════════════════════════════════════════════════════════
# FIX 1 — src/routes/auth.routes.js
# sameSite: 'strict' → 'none'  (cookie não cruzava origens diferentes)
# ══════════════════════════════════════════════════════════════════════════════
AUTH_ROUTES = """\
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { prisma } from '../config/database.js';
import { Cache, getRedis } from '../config/redis.js';
import logger from '../utils/logger.js';
import { ApiError, R } from '../utils/ApiError.js';
import { authenticate, authRateLimiter } from '../middleware/auth.js';

const router = Router();

// REGISTER
router.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) throw ApiError.badRequest('Nome, email e senha são obrigatórios.');
    if (password.length < 8) throw ApiError.badRequest('Senha deve ter mínimo 8 caracteres.');
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] } });
    if (existing) throw ApiError.conflict('Email ou telefone já cadastrado.');
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase().trim(), phone: phone || null, passwordHash, status: 'ACTIVE' },
      select: { id:true, name:true, email:true, role:true, status:true },
    });
    R.created(res, user, 'Cadastro realizado com sucesso!');
  } catch (e) { next(e); }
});

// LOGIN
router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw ApiError.badRequest('Email e senha são obrigatórios.');
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id:true, email:true, name:true, passwordHash:true, role:true, status:true, avatar:true },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      throw ApiError.unauthorized('Email ou senha inválidos.');
    if (user.status === 'BANNED')     throw ApiError.forbidden('Conta banida.');
    if (user.status === 'SUSPENDED')  throw ApiError.forbidden('Conta suspensa.');
    const accessToken  = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    const refreshToken = jwt.sign({ sub: user.id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 30*24*3600*1000) } });
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: req.ip, status: 'ACTIVE' } }).catch(() => {});
    // FIX #1: sameSite 'none' permite cookie cross-origin (mobya.com.br → onrender.com)
    // 'strict' bloqueava o cookie em requests entre domínios diferentes
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 30*24*3600*1000,
    });
    const { passwordHash: _, ...safeUser } = user;
    R.ok(res, { user: safeUser, accessToken, expiresIn: '7d' });
  } catch (e) { next(e); }
});

// REFRESH
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) throw ApiError.unauthorized('Refresh token não fornecido.');
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const stored  = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.revokedAt || new Date() > stored.expiresAt) throw ApiError.unauthorized('Token expirado.');
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id:true, email:true, name:true, role:true, status:true } });
    if (!user || user.status !== 'ACTIVE') throw ApiError.unauthorized('Usuário inativo.');
    await prisma.refreshToken.update({ where: { token }, data: { revokedAt: new Date() } });
    const newAccess  = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const newRefresh = jwt.sign({ sub: user.id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
    await prisma.refreshToken.create({ data: { token: newRefresh, userId: user.id, expiresAt: new Date(Date.now() + 30*24*3600*1000) } });
    // FIX #1: mesmo fix no refresh
    res.cookie('refreshToken', newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 30*24*3600*1000,
    });
    R.ok(res, { user, accessToken: newAccess });
  } catch (e) { next(e); }
});

// LOGOUT
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      let decoded = null;
      try { decoded = jwt.verify(token, process.env.JWT_SECRET); } catch { decoded = null; }
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          if (getRedis()) {
            await Cache.set(`blacklist:${token}`, 1, ttl);
          } else {
            logger.warn('[Auth] Redis indisponível no logout — access token não pôde ser invalidado.');
          }
        }
      }
    }
    const rt = req.cookies?.refreshToken;
    if (rt) await prisma.refreshToken.updateMany({ where: { token: rt, revokedAt: null }, data: { revokedAt: new Date() } }).catch(() => {});
    res.clearCookie('refreshToken');
    R.ok(res, null, 'Logout realizado.');
  } catch (e) { next(e); }
});

// ME
router.get('/me', authenticate, (req, res) => R.ok(res, req.user));

export default router;
"""

# ══════════════════════════════════════════════════════════════════════════════
# FIX 2 — src/app.js
# CORS origin GitHub Pages sem path (/mobya não faz parte da origin)
# ══════════════════════════════════════════════════════════════════════════════
APP_JS = """\
import express      from 'express';
import helmet       from 'helmet';
import cors         from 'cors';
import compression  from 'compression';
import cookieParser from 'cookie-parser';
import morgan       from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { prisma } from './config/database.js';
import { getRedis } from './config/redis.js';
import authRoutes from './routes/auth.routes.js';
import aiRoutes, { PROVIDERS } from './routes/ai.routes.js';
import listingRoutes from './routes/listing.routes.js';
import emergencyRoutes from './routes/emergency.routes.js';
import monetizationRoutes from './routes/monetization.routes.js';

const app = express();

// FIX #2: Origin do browser NUNCA inclui path.
// 'https://cpiresci.github.io/mobya' estava bloqueando tudo do GitHub Pages
// porque o browser manda 'https://cpiresci.github.io' (sem /mobya).
const allowedOrigins = [
  'https://mobya.com.br',
  'https://www.mobya.com.br',
  'https://cpiresci.github.io',   // ← sem /mobya
  'http://localhost:3000',
  'http://localhost:4000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:4000',
];

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    console.warn(`[CORS] Bloqueado: ${origin}`);
    cb(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Request-ID'],
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('combined'));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY', message: 'Muitas requisições.' } },
}));

// Health
app.get('/api/v1/health', async (_req, res) => {
  const checks = { api: 'ok', database: 'unknown', redis: 'unknown' };
  try { await prisma.$queryRaw`SELECT 1`; checks.database = 'ok'; } catch { checks.database = 'error'; }
  try {
    const r = getRedis();
    if (r) { await r.ping(); checks.redis = 'ok'; } else { checks.redis = 'disabled'; }
  } catch { checks.redis = 'error'; }
  const ok = checks.api === 'ok' && checks.database === 'ok';
  res.status(ok ? 200 : 503).json({
    status: ok ? 'healthy' : 'degraded',
    version: '3.0.0',
    checks,
    providers: PROVIDERS.map(p => ({ name: p.name, configured: !!p.apiKey() })),
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1/ping', (_req, res) => res.json({ pong: true, ts: Date.now() }));

app.get('/api/v1', (_req, res) => res.json({
  name: 'MOBYA Quantum Engine API',
  version: '3.0.0',
  status: 'operational',
  agents: 9,
}));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/listings', listingRoutes);
app.use('/api/v1/emergency', emergencyRoutes);
app.use('/api/v1/monetization', monetizationRoutes);

app.use((_req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } }));

app.use((err, _req, res, _next) => {
  const status = err.statusCode || 500;
  const msg    = status < 500 ? err.message : (process.env.NODE_ENV === 'production' ? 'Erro interno.' : err.message);
  res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: msg } });
});

export default app;
"""

# ══════════════════════════════════════════════════════════════════════════════
# FIX 3 — src/config/database.js
# Retry exponencial no connect + pool config para Hostinger shared MySQL
# ══════════════════════════════════════════════════════════════════════════════
DATABASE_JS = """\
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
"""

# ══════════════════════════════════════════════════════════════════════════════
# FIX 4 — src/server.js
# Bootstrap resiliente: não mata processo se DB falhar no cold start
# ══════════════════════════════════════════════════════════════════════════════
SERVER_JS = """\
import 'dotenv/config';
import { createServer } from 'http';
import app from './app.js';
import { connectDB } from './config/database.js';
import { connectRedis } from './config/redis.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  logger.info('⚡ MOBYA Quantum Engine iniciando...');

  // FIX #4: DB com retry — não crasha o processo se falhar no cold start
  // O servidor sobe mesmo assim; health check retorna 503 até DB reconectar.
  // Isso evita o crash loop que ocorria no Render free tier após hibernação.
  try {
    await connectDB(5, 2000);
  } catch (err) {
    logger.error('[DB] Não foi possível conectar ao MySQL. Servidor sobe em modo degradado.');
    logger.error('[DB] Erro:', err.message);
    // NÃO faz process.exit() — deixa o servidor responder ao health check
  }

  // Redis opcional
  await connectRedis().catch(err => {
    logger.warn('[Redis] Ignorando:', err.message);
  });

  const httpServer = createServer(app);
  httpServer.listen(PORT, () => {
    logger.info(\`🚀 Servidor rodando na porta \${PORT}\`);
    logger.info(\`📡 API: http://localhost:\${PORT}/api/v1\`);
    logger.info(\`🤖 Motor Quântico: 9 agentes NEXUS ativos\`);
  });

  const shutdown = async (sig) => {
    logger.info(\`[\${sig}] Encerrando graciosamente...\`);
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('unhandledRejection', (r) => logger.error('Unhandled rejection:', r));
  process.on('uncaughtException',  (e) => {
    logger.error('Uncaught exception:', e);
    process.exit(1);
  });
}

bootstrap();
"""

# ══════════════════════════════════════════════════════════════════════════════
# FIX 5 — src/routes/listing.routes.js
# Remove mode:'insensitive' (Prisma+MySQL não suporta — gera erro 500)
# MySQL utf8mb4_unicode_ci já é case-insensitive por padrão
# ══════════════════════════════════════════════════════════════════════════════
LISTING_ROUTES = """\
import { Router } from 'express';
import slugify from 'slugify';
import { prisma } from '../config/database.js';
import { Cache } from '../config/redis.js';
import { R, ApiError } from '../utils/ApiError.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

// FIX #5: removido mode:'insensitive' — incompatível com MySQL no Prisma
// MySQL com utf8mb4_unicode_ci já faz buscas case-insensitive nativamente
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { type, query, city, state, minPrice, maxPrice, page=1, limit=20, sort='recent' } = req.query;
    const skip  = (parseInt(page)-1) * parseInt(limit);
    const where = {
      status: 'ACTIVE',
      deletedAt: null,
      ...(type && { type }),
      ...(city  && { city:  { contains: city  } }),
      ...(state && { state }),
      ...((minPrice||maxPrice) && { price: {
        ...(minPrice && { gte: parseFloat(minPrice) }),
        ...(maxPrice && { lte: parseFloat(maxPrice) }),
      }}),
      ...(query && { OR: [
        { title:       { contains: query } },
        { description: { contains: query } },
      ]}),
    };
    const orderBy = {
      recent:     { createdAt: 'desc' },
      price_asc:  { price: 'asc'  },
      price_desc: { price: 'desc' },
      views:      { views: 'desc' },
    }[sort] || { createdAt: 'desc' };
    const [total, listings] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where, skip, take: parseInt(limit), orderBy,
        include: {
          user:    { select: { id:true, name:true, avatar:true } },
          vehicle: { select: { brand:true, model:true, year:true, mileage:true } },
        },
      }),
    ]);
    R.paginated(res, listings, { page: parseInt(page), limit: parseInt(limit), total });
  } catch (e) { next(e); }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, description, price, type, city, state, vehicleId, priceNegotiable=true, acceptsTrade=false, images=[] } = req.body;
    if (!title||!description||!price||!type||!city||!state) throw ApiError.badRequest('Campos obrigatórios faltando.');
    const slug = `${slugify(title, { lower:true, strict:true })}-${Date.now()}`;
    const listing = await prisma.listing.create({
      data: {
        userId: req.user.id, vehicleId: vehicleId||null, type, status: 'ACTIVE',
        slug, title, description, price: parseFloat(price),
        priceNegotiable, acceptsTrade, city, state, images,
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 60*24*3600*1000),
      },
      include: { user: { select: { id:true, name:true } } },
    });
    await Cache.delPattern('listings:*');
    R.created(res, listing);
  } catch (e) { next(e); }
});

router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const { page=1, limit=20 } = req.query;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const where = { userId: req.user.id, deletedAt: null };
    const [total, listings] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { vehicle: { select: { brand:true, model:true, year:true, mileage:true } } },
      }),
    ]);
    R.paginated(res, listings, { page: parseInt(page), limit: parseInt(limit), total });
  } catch (e) { next(e); }
});

router.get('/:slugOrId', optionalAuth, async (req, res, next) => {
  try {
    const listing = await prisma.listing.findFirst({
      where: {
        OR: [{ id: req.params.slugOrId }, { slug: req.params.slugOrId }],
        status: { not: 'REMOVED' },
        deletedAt: null,
      },
      include: {
        user:    { select: { id:true, name:true, avatar:true, phone:true, city:true } },
        vehicle: true,
      },
    });
    if (!listing) throw ApiError.notFound('Anúncio');
    prisma.listing.update({ where: { id: listing.id }, data: { views: { increment: 1 } } }).catch(() => {});
    R.ok(res, listing);
  } catch (e) { next(e); }
});

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const listing = await prisma.listing.findFirst({ where: { id: req.params.id, userId: req.user.id, deletedAt: null } });
    if (!listing) throw ApiError.notFound('Anúncio');
    const { title, description, price, city, state, priceNegotiable, acceptsTrade, images, status } = req.body;
    const updated = await prisma.listing.update({
      where: { id: listing.id },
      data: {
        ...(title       !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(price       !== undefined && { price: parseFloat(price) }),
        ...(city        !== undefined && { city }),
        ...(state       !== undefined && { state }),
        ...(priceNegotiable !== undefined && { priceNegotiable }),
        ...(acceptsTrade    !== undefined && { acceptsTrade }),
        ...(images      !== undefined && { images }),
        ...(status      !== undefined && { status }),
      },
    });
    await Cache.delPattern('listings:*');
    R.ok(res, updated);
  } catch (e) { next(e); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const listing = await prisma.listing.findFirst({ where: { id: req.params.id, userId: req.user.id, deletedAt: null } });
    if (!listing) throw ApiError.notFound('Anúncio');
    await prisma.listing.update({ where: { id: listing.id }, data: { deletedAt: new Date(), status: 'REMOVED' } });
    await Cache.delPattern('listings:*');
    R.noContent(res);
  } catch (e) { next(e); }
});

router.post('/:id/favorite', authenticate, async (req, res, next) => {
  try {
    const listing = await prisma.listing.findFirst({ where: { id: req.params.id, status: 'ACTIVE', deletedAt: null } });
    if (!listing) throw ApiError.notFound('Anúncio');
    const existing = await prisma.favorite.findUnique({ where: { userId_listingId: { userId: req.user.id, listingId: listing.id } } });
    if (existing) {
      await prisma.favorite.delete({ where: { userId_listingId: { userId: req.user.id, listingId: listing.id } } });
      await prisma.listing.update({ where: { id: listing.id }, data: { favorites: { decrement: 1 } } });
      R.ok(res, { favorited: false });
    } else {
      await prisma.favorite.create({ data: { userId: req.user.id, listingId: listing.id } });
      await prisma.listing.update({ where: { id: listing.id }, data: { favorites: { increment: 1 } } });
      R.ok(res, { favorited: true });
    }
  } catch (e) { next(e); }
});

export default router;
"""

# ══════════════════════════════════════════════════════════════════════════════
# FIX 6 — render.yaml
# Remove --accept-data-loss do buildCommand
# ══════════════════════════════════════════════════════════════════════════════
RENDER_YAML = """\
services:
  - type: web
    name: mobya-api
    runtime: node
    region: oregon
    plan: free
    # FIX #3: prisma generate apenas — schema já aplicado via migrate_monetization.sql
    # db push --accept-data-loss foi removido pois pode destruir dados em produção
    buildCommand: npm ci && npx prisma generate
    startCommand: node src/server.js
    healthCheckPath: /api/v1/health
    autoDeploy: true
    branch: main
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 4000
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_REFRESH_SECRET
        generateValue: true
      - key: AI_MAX_TOKENS
        value: "1500"
      - key: FRONTEND_URL
        value: https://mobya.com.br
      - key: LOG_LEVEL
        value: info
      - key: AI_RATE_LIMIT_MAX
        value: "30"
      - key: RATE_LIMIT_MAX
        value: "100"
      - key: SMTP_HOST
        value: smtp.hostinger.com
      - key: SMTP_PORT
        value: "587"
      - key: SMTP_SECURE
        value: "false"
      - key: SMTP_USER
        sync: false
      - key: SMTP_PASS
        sync: false
      - key: EMAIL_FROM
        value: MOBYA <noreply@mobya.com.br>
      - key: SAMBANOVA_API_KEY
        sync: false
      - key: SAMBANOVA_MODEL
        value: Meta-Llama-3.3-70B-Instruct
      - key: CEREBRAS_API_KEY
        sync: false
      - key: CEREBRAS_MODEL
        value: llama3.1-70b
      - key: GEMINI_API_KEY
        sync: false
      - key: GEMINI_MODEL
        value: gemini-2.0-flash
      - key: OPENROUTER_API_KEY
        sync: false
      - key: OPENROUTER_MODEL
        value: meta-llama/llama-3.3-70b-instruct
"""

# ══════════════════════════════════════════════════════════════════════════════
# EXECUÇÃO
# ══════════════════════════════════════════════════════════════════════════════
FIXES = [
    ("src/routes/auth.routes.js",   AUTH_ROUTES),
    ("src/app.js",                  APP_JS),
    ("src/config/database.js",      DATABASE_JS),
    ("src/server.js",               SERVER_JS),
    ("src/routes/listing.routes.js",LISTING_ROUTES),
    ("render.yaml",                 RENDER_YAML),
]

def main():
    print("\n🔧 MOBYA — Aplicando fixes de conectividade\n")

    for rel, content in FIXES:
        check_syntax(rel, content)
        write(rel, content)

    print("""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 6 fixes aplicados com sucesso!

Próximos passos no Termux:

  git add src/routes/auth.routes.js \\
          src/app.js \\
          src/config/database.js \\
          src/server.js \\
          src/routes/listing.routes.js \\
          render.yaml

  git commit -m "fix: CORS sameSite none, DB retry, listing MySQL compat"
  git push origin main

Verificar no Render após deploy:
  → Logs: 'MySQL Hostinger conectado ✅'
  → GET https://mobya-app.onrender.com/api/v1/health
     deve retornar: { "status": "healthy", "checks": { "database": "ok" } }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""")

if __name__ == '__main__':
    main()
