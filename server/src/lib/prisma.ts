import { PrismaClient } from '@prisma/client';
import { isProduction } from '../config/env';

/**
 * A single PrismaClient per process. In development the module registry is reset on
 * every hot reload, so the instance is cached on globalThis to avoid exhausting the
 * database connection pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ['warn', 'error'] : ['warn', 'error'],
  });

if (!isProduction) globalForPrisma.prisma = prisma;

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
