import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decryptSecret } from '../../../common/crypto/secret-crypto';
import { DEFAULT_COMPANY_ID } from '../../../company/company.constants';
import { CompanySettingsService } from '../../../company-settings/company-settings.service';
import { PrismaService } from '../../../prisma/prisma.service';
import type { GraphInstagramBusinessAccount, GraphPageRow } from '../domain/instagram-insights.types';
import { InstagramGraphClient } from './instagram-graph.client';

export interface ResolvedInstagramCredentials {
  clientId: string;
  companyName: string;
  avatarUrl: string | null;
  instagram: string | null;
  instagramUserId: string;
  accessToken: string;
  hasMetaAccessToken: boolean;
}

@Injectable()
export class InstagramCredentialsResolver {
  private readonly logger = new Logger(InstagramCredentialsResolver.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly companySettings: CompanySettingsService,
    private readonly graph: InstagramGraphClient,
  ) {}

  async listConnectedClients() {
    // #region agent log
    const schemaProbe = await this.prisma.$queryRaw<
      Array<{ schema: string }>
    >`SELECT current_schema() AS schema`;
    fetch('http://127.0.0.1:7726/ingest/f61a8b4f-537b-4440-a74f-2179a1f0cffe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': 'fd3a09',
      },
      body: JSON.stringify({
        sessionId: 'fd3a09',
        runId: 'post-fix',
        hypothesisId: 'C',
        location: 'instagram-credentials.resolver.ts:listConnectedClients',
        message: 'instagram listConnectedClients schema probe',
        data: {
          currentSchema: schemaProbe[0]?.schema ?? null,
          envSchema: this.config.get<string>('SUPABASE_DB_SCHEMA') ?? null,
          hasEnvMetaToken: Boolean(
            this.config.get<string>('META_ACCESS_TOKEN')?.trim(),
          ),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const clients = await this.prisma.client.findMany({
      where: {
        isActive: true,
        instagramUserId: { not: null },
      },
      orderBy: { companyName: 'asc' },
      select: {
        id: true,
        companyName: true,
        avatarUrl: true,
        instagram: true,
        instagramUserId: true,
        metaAccessToken: true,
      },
    });

    return clients
      .filter((client) => Boolean(client.instagramUserId?.trim()))
      .map((client) => ({
        id: client.id,
        companyName: client.companyName,
        avatarUrl: client.avatarUrl,
        instagram: client.instagram,
        instagramUserId: client.instagramUserId,
        hasMetaAccessToken: Boolean(client.metaAccessToken),
      }));
  }

  async syncFromMeta() {
    const accessToken = await this.resolveTenantAccessToken();
    if (!accessToken) {
      return;
    }

    try {
      const pages = await this.graph.listPages(accessToken);
      for (const page of pages) {
        const instagram = page.instagram_business_account;
        if (!instagram?.id) {
          continue;
        }
        await this.upsertClientFromInstagram(page, instagram);
      }
    } catch (error) {
      this.logger.warn(`Failed to sync Instagram accounts: ${String(error)}`);
    }
  }

  async resolveForClient(clientId: string): Promise<ResolvedInstagramCredentials> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        companyName: true,
        avatarUrl: true,
        instagram: true,
        instagramUserId: true,
        metaAccessToken: true,
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const clientToken = this.decrypt(client.metaAccessToken);
    const accessToken = clientToken ?? (await this.resolveTenantAccessToken());
    const instagramUserId = client.instagramUserId?.trim() ?? '';

    if (!instagramUserId) {
      throw new NotFoundException(
        'Conta Instagram não configurada para este cliente',
      );
    }

    if (!accessToken) {
      throw new NotFoundException(
        'Token de acesso Meta não configurado para este cliente',
      );
    }

    return {
      clientId: client.id,
      companyName: client.companyName,
      avatarUrl: client.avatarUrl,
      instagram: client.instagram,
      instagramUserId,
      accessToken,
      hasMetaAccessToken: Boolean(client.metaAccessToken),
    };
  }

  private async upsertClientFromInstagram(
    page: GraphPageRow,
    instagram: GraphInstagramBusinessAccount,
  ) {
    const handle = normalizeInstagramHandle(instagram.username);
    const companyName =
      instagram.name?.trim() || page.name?.trim() || handle || instagram.id;
    const existing = await this.findMatchingClient(
      instagram.id,
      handle,
      companyName,
    );

    if (existing) {
      await this.prisma.client.update({
        where: { id: existing.id },
        data: {
          instagramUserId: instagram.id,
          instagram: handle ?? existing.instagram,
          avatarUrl: instagram.profile_picture_url ?? existing.avatarUrl,
        },
      });
      return;
    }

    await this.prisma.client.create({
      data: {
        companyId: DEFAULT_COMPANY_ID,
        companyName,
        instagram: handle,
        instagramUserId: instagram.id,
        avatarUrl: instagram.profile_picture_url ?? null,
        isActive: true,
      },
    });
  }

  private async findMatchingClient(
    instagramUserId: string,
    handle: string | null,
    companyName: string,
  ) {
    const byId = await this.prisma.client.findFirst({
      where: { instagramUserId },
    });
    if (byId) {
      return byId;
    }

    if (handle) {
      const variants = [handle, handle.replace(/^@/, ''), `@${handle.replace(/^@/, '')}`];
      const byHandle = await this.prisma.client.findFirst({
        where: {
          instagram: { in: variants, mode: 'insensitive' },
        },
      });
      if (byHandle) {
        return byHandle;
      }
    }

    return this.prisma.client.findFirst({
      where: {
        companyName: { equals: companyName, mode: 'insensitive' },
      },
    });
  }

  private async resolveTenantAccessToken(): Promise<string | null> {
    const companyToken = await this.resolveCompanyToken();
    if (companyToken) {
      return companyToken;
    }

    const envToken = this.config.get<string>('META_ACCESS_TOKEN')?.trim();
    if (!envToken) {
      return null;
    }

    try {
      await this.companySettings.updateIntegrations({
        metaPageAccessToken: envToken,
      });
    } catch (error) {
      this.logger.warn(
        `Could not persist tenant Meta token: ${String(error)}`,
      );
    }

    return envToken;
  }

  private async resolveCompanyToken(): Promise<string | null> {
    try {
      const credentials =
        await this.companySettings.getMetaCredentialsForCurrentTenant();
      return credentials.metaPageAccessToken?.trim() || null;
    } catch {
      return null;
    }
  }

  private decrypt(value: string | null): string | null {
    if (!value) {
      return null;
    }
    try {
      const secret =
        this.config.get<string>('TENANT_SECRETS_KEY')?.trim() ||
        this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
      return decryptSecret(value, secret).trim() || null;
    } catch {
      return null;
    }
  }
}

function normalizeInstagramHandle(username?: string | null): string | null {
  const trimmed = username?.trim().replace(/^@/, '');
  if (!trimmed) {
    return null;
  }
  return `@${trimmed.toLowerCase()}`;
}
