import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { disconnectPrisma } from './lib/prisma';

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info('CardMaxxing API listening', { port: env.PORT, env: env.NODE_ENV });
});

async function shutdown(signal: string): Promise<void> {
  logger.info('Shutting down', { signal });
  server.close(() => {
    void disconnectPrisma().finally(() => process.exit(0));
  });
  // Force-exit if connections refuse to drain.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});
