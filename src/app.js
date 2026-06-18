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
