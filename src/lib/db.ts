import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const db = globalThis.prisma || new PrismaClient({
  log: ['query', 'error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') globalThis.prisma = db; 