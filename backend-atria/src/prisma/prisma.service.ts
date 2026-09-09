import { PrismaClient } from '@prisma/client';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createTenantIsolationExtension } from '../tenancy/infrastructure/tenant-isolation.extension';

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
    super({
      datasources: process.env.DATABASE_URL
        ? {
            db: {
              url: resolvePrismaDatabaseUrl(process.env.DATABASE_URL) as string,
            },
          }
        : undefined,
      transactionOptions: PRISMA_TRANSACTION_OPTIONS,
    });

    const extended = this.$extends(createTenantIsolationExtension(this));
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (
          prop === 'onModuleInit' ||
          prop === 'onModuleDestroy' ||
          prop === 'constructor'
        ) {
          return Reflect.get(target, prop, receiver);
        }
        return Reflect.get(extended, prop, extended);
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
