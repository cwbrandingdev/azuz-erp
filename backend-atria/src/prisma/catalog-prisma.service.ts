import { PrismaClient } from '@prisma/catalog-client';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PRISMA_TRANSACTION_OPTIONS } from './prisma.service';

function resolveCatalogDatabaseUrl(url: string | undefined) {
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
export class CatalogPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CatalogPrismaService.name);

  constructor() {
    const url = resolveCatalogDatabaseUrl(process.env.CATALOG_DATABASE_URL);
    super({
      ...(url ? { datasources: { db: { url } } } : {}),
      transactionOptions: PRISMA_TRANSACTION_OPTIONS,
    });
  }

  async onModuleInit() {
    if (!process.env.CATALOG_DATABASE_URL?.trim()) {
      this.logger.error(
        'CATALOG_DATABASE_URL is not set — company catalog search will fail.',
      );
      throw new Error('CATALOG_DATABASE_URL is required');
    }
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}