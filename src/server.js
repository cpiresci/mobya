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
