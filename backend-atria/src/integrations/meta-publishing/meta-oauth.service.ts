import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { encryptSecret } from '../../common/crypto/secret-crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { InstagramGraphClient } from '../instagram-insights/infrastructure/instagram-graph.client';
const META_OAUTH_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'pages_show_list',
  'pages_read_engagement',
].join(',');

@Injectable()
export class MetaOAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly graph: InstagramGraphClient,
  ) {}

  getRequiredScopes(): string[] {
    return META_OAUTH_SCOPES.split(',');
  }

  isConfigured(): boolean {
    return Boolean(this.appId() && this.appSecret() && this.redirectUri());
  }

  async buildAuthorizationUrl(clientId: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'Integração Meta OAuth não configurada (META_APP_ID, META_APP_SECRET, META_OAUTH_REDIRECT_URI)',
      );
    }

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const state = this.signState(clientId);
    const url = new URL(
      `https://www.facebook.com/${this.graphVersion()}/dialog/oauth`,
    );
    url.searchParams.set('client_id', this.appId()!);
    url.searchParams.set('redirect_uri', this.redirectUri()!);
    url.searchParams.set('scope', META_OAUTH_SCOPES);
    url.searchParams.set('state', state);
    url.searchParams.set('response_type', 'code');
    return url.toString();
  }

  async completeAuthorization(
    code: string,
    state: string,
  ): Promise<{ clientId: string; instagramUsername: string | null }> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Integração Meta OAuth não configurada');
    }

    const clientId = this.verifyState(state);
    const shortToken = await this.exchangeCodeForToken(code);
    const userToken = await this.exchangeForLongLivedToken(shortToken);
    const page = await this.resolveInstagramPage(userToken, clientId);
    if (!page?.instagram_business_account?.id || !page.access_token) {
      throw new BadRequestException(
        'Nenhuma página do Facebook com conta Instagram profissional encontrada',
      );
    }

    const ig = page.instagram_business_account;
    const handle = ig.username ? `@${ig.username.replace(/^@/, '')}` : null;

    await this.prisma.client.update({
      where: { id: clientId },
      data: {
        instagramUserId: ig.id,
        instagram: handle,
        metaAccessToken: this.encryptToken(page.access_token),
        avatarUrl: ig.profile_picture_url ?? undefined,
      },
    });

    return { clientId, instagramUsername: ig.username ?? null };
  }

  buildFrontendSuccessRedirect(clientId: string) {
    const base = this.frontendUrl().replace(/\/$/, '');
    return `${base}/clients?metaConnected=${encodeURIComponent(clientId)}`;
  }

  buildFrontendErrorRedirect(message: string) {
    const base = this.frontendUrl().replace(/\/$/, '');
    return `${base}/clients?metaError=${encodeURIComponent(message)}`;
  }

  private async resolveInstagramPage(userToken: string, clientId: string) {
    const pages = await this.graph.listPages(userToken);
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { instagramUserId: true },
    });

    const withIg = pages.filter((page) => page.instagram_business_account?.id);
    if (withIg.length === 0) {
      return null;
    }

    if (client?.instagramUserId) {
      const matched = withIg.find(
        (page) => page.instagram_business_account?.id === client.instagramUserId,
      );
      if (matched) {
        return matched;
      }
    }

    return withIg.length === 1 ? withIg[0] : withIg[0];
  }

  private async exchangeCodeForToken(code: string): Promise<string> {
    const url = new URL(`${this.graphBase()}/oauth/access_token`);
    url.searchParams.set('client_id', this.appId()!);
    url.searchParams.set('client_secret', this.appSecret()!);
    url.searchParams.set('redirect_uri', this.redirectUri()!);
    url.searchParams.set('code', code);

    const response = await fetch(url);
    const payload = (await response.json()) as {
      access_token?: string;
      error?: { message?: string };
    };
    if (!response.ok || !payload.access_token) {
      throw new BadRequestException(
        payload.error?.message ?? 'Falha ao obter token do Meta',
      );
    }
    return payload.access_token;
  }

  private async exchangeForLongLivedToken(shortToken: string): Promise<string> {
    const url = new URL(`${this.graphBase()}/oauth/access_token`);
    url.searchParams.set('grant_type', 'fb_exchange_token');
    url.searchParams.set('client_id', this.appId()!);
    url.searchParams.set('client_secret', this.appSecret()!);
    url.searchParams.set('fb_exchange_token', shortToken);

    const response = await fetch(url);
    const payload = (await response.json()) as {
      access_token?: string;
      error?: { message?: string };
    };
    if (!response.ok || !payload.access_token) {
      throw new BadRequestException(
        payload.error?.message ?? 'Falha ao renovar token do Meta',
      );
    }
    return payload.access_token;
  }

  private signState(clientId: string): string {
    const payload = Buffer.from(
      JSON.stringify({ clientId, ts: Date.now() }),
    ).toString('base64url');
    const signature = createHmac('sha256', this.stateSecret())
      .update(payload)
      .digest('base64url');
    return `${payload}.${signature}`;
  }

  private verifyState(state: string): string {
    const [payload, signature] = state.split('.');
    if (!payload || !signature) {
      throw new BadRequestException('State OAuth inválido');
    }

    const expected = createHmac('sha256', this.stateSecret())
      .update(payload)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (
      sigBuf.length !== expBuf.length ||
      !timingSafeEqual(sigBuf, expBuf)
    ) {
      throw new BadRequestException('State OAuth inválido');
    }

    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { clientId?: string; ts?: number };

    if (!parsed.clientId || !parsed.ts) {
      throw new BadRequestException('State OAuth inválido');
    }

    if (Date.now() - parsed.ts > 15 * 60 * 1000) {
      throw new BadRequestException('Sessão OAuth expirada');
    }

    return parsed.clientId;
  }

  private encryptToken(token: string) {
    const secret =
      this.config.get<string>('TENANT_SECRETS_KEY')?.trim() ||
      this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    return encryptSecret(token.trim(), secret);
  }

  private appId() {
    return this.config.get<string>('META_APP_ID')?.trim() || null;
  }

  private appSecret() {
    return this.config.get<string>('META_APP_SECRET')?.trim() || null;
  }

  private redirectUri() {
    return this.config.get<string>('META_OAUTH_REDIRECT_URI')?.trim() || null;
  }

  private graphVersion() {
    return (
      this.config.get<string>('META_API_VERSION')?.trim() || 'v21.0'
    ).replace(/^\/+/, '');
  }

  private graphBase() {
    return `https://graph.facebook.com/${this.graphVersion()}`;
  }

  private frontendUrl() {
    return (
      this.config.get<string>('FRONTEND_URL')?.trim() ||
      this.config.get<string>('APP_URL')?.trim() ||
      'http://localhost:3000'
    );
  }

  private stateSecret() {
    return this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
  }
}
