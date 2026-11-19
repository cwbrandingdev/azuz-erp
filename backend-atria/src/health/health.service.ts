import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

export type HealthStatus = 'ok' | 'degraded' | 'error';

export interface HealthCheckResult {
  status: HealthStatus;
  // Commit publicado (definido no build). "unknown" fora do deploy oficial.
  version: string;
  timestamp: string;
  database: {
    status: 'up' | 'down';
    latencyMs: number | null;
    schema: string;
  };
  supabase: {
    configured: boolean;
    status: 'up' | 'down' | 'skipped';
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const schema =
      this.configService.get<string>('SUPABASE_DB_SCHEMA') ?? 'public';
    const database = await this.checkDatabase();
    const supabase = await this.checkSupabase();

    let status: HealthStatus = 'ok';
    if (database.status === 'down') {
      status = 'error';
    } else if (supabase.configured && supabase.status === 'down') {
      status = 'degraded';
    }

    return {
      status,
      version:
        this.configService.get<string>('GIT_SHA') ??
        process.env.GIT_SHA ??
        'unknown',
      timestamp: new Date().toISOString(),
      database: {
        ...database,
        schema,
      },
      supabase,
    };
  }

  private async checkDatabase(): Promise<{
    status: 'up' | 'down';
    latencyMs: number | null;
  }> {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        latencyMs: Date.now() - startedAt,
      };
    } catch {
      return {
        status: 'down',
        latencyMs: null,
      };
    }
  }

  private async checkSupabase(): Promise<{
    configured: boolean;
    status: 'up' | 'down' | 'skipped';
  }> {
    if (!this.supabase.isConfigured) {
      return {
        configured: false,
        status: 'skipped',
      };
    }

    const ok = await this.supabase.ping();
    return {
      configured: true,
      status: ok ? 'up' : 'down',
    };
  }
}
