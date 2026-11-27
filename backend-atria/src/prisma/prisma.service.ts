import { AsyncLocalStorage } from 'async_hooks';
import { PrismaClient } from '@prisma/client';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

export const requestQueryCount = new AsyncLocalStorage<{ count: number }>();

export const PRISMA_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;

function resolvePrismaDatabaseUrl(url: string | undefined) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const current = Number(parsed.searchParams.get('connection_limit') ?? '0');
    if (!Number.isFinite(current) || current < 5) {
      parsed.searchParams.set('connection_limit', '5');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const url = resolvePrismaDatabaseUrl(process.env.DATABASE_URL);
    if (url) {
      try {
        const parsed = new URL(url);
        console.log(
          `prisma schema=${parsed.searchParams.get('schema') ?? '(none)'} connection_limit=${parsed.searchParams.get('connection_limit') ?? '(default)'}`,
        );
      } catch {
        console.log('prisma database url could not be parsed');
      }
    }
    const traceQueries = process.env.TRACE_REQUESTS === '1';
    super({
      ...(url ? { datasources: { db: { url } } } : {}),
      transactionOptions: PRISMA_TRANSACTION_OPTIONS,
      ...(traceQueries
        ? { log: [{ emit: 'event' as const, level: 'query' as const }] }
        : {}),
    });

    if (traceQueries) {
      (
        this as unknown as {
          $on: (
            event: 'query',
            cb: (event: { duration: number; query: string }) => void,
          ) => void;
        }
      ).$on('query', (event) => {
        const store = requestQueryCount.getStore();
        if (store) store.count += 1;
        const sql = event.query.replace(/\s+/g, ' ').slice(0, 140);
        console.log(`Q ms=${event.duration} ${sql}`);
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
