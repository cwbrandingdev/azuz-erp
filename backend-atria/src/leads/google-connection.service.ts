import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import { decryptSecret, encryptSecret } from '../common/crypto/secret-crypto';
import { DEFAULT_COMPANY_ID } from '../company/company.constants';
import { PrismaService } from '../prisma/prisma.service';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/meetings.space.created',
];
// Permitem mostrar na tela qual conta foi conectada.
const IDENTITY_SCOPES = ['openid', 'email'];
const STATE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class GoogleConnectionService {
  private readonly logger = new Logger(GoogleConnectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // O token salvo pelo botão tem prioridade; sem ele, vale o do servidor.
  async getRefreshToken(): Promise<string | undefined> {
    const connection = await this.findConnection();
    if (!connection) return this.read('GOOGLE_REFRESH_TOKEN');

    try {
      return decryptSecret(connection.refreshToken, this.secretKey());
    } catch {
      this.logger.error(
        'Não foi possível ler o token salvo do Google. Reconecte a conta.',
      );
      return this.read('GOOGLE_REFRESH_TOKEN');
    }
  }

  async getDetails() {
    const connection = await this.findConnection();
    const fallback = this.read('GOOGLE_REFRESH_TOKEN') ? 'server' : 'none';

    return {
      source: connection ? 'system' : fallback,
      accountEmail: connection?.accountEmail ?? null,
      connectedAt: connection?.connectedAt.toISOString() ?? null,
    };
  }

  buildAuthorizationUrl(userId: string): string {
    const { clientId, redirectUri } = this.oauthSettings();
    const url = new URL(AUTH_URL);
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: [...CALENDAR_SCOPES, ...IDENTITY_SCOPES].join(' '),
      access_type: 'offline',
      // Sem isto o Google pode não devolver um refresh token novo.
      prompt: 'consent',
      state: this.createState(userId),
    }).toString();
    return url.toString();
  }

  async connect(code: string, state: string): Promise<void> {
    const userId = this.readState(state);
    const { clientId, clientSecret, redirectUri } = this.oauthSettings();

    const response = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15_000,
      },
    );
    const data = response.data as {
      refresh_token?: string;
      scope?: string;
      id_token?: string;
    };

    // Na tela do Google é possível desmarcar permissões; sem elas a agenda falha.
    const granted = data.scope?.split(' ') ?? [];
    if (CALENDAR_SCOPES.some((scope) => !granted.includes(scope))) {
      throw new BadRequestException(
        'Marque todas as permissões na tela do Google.',
      );
    }
    if (!data.refresh_token) {
      throw new BadRequestException('O Google não devolveu um refresh token.');
    }

    const saved = {
      refreshToken: encryptSecret(data.refresh_token, this.secretKey()),
      accountEmail: readEmail(data.id_token),
      connectedById: userId,
      connectedAt: new Date(),
    };
    await this.prisma.googleCalendarConnection.upsert({
      where: { companyId: DEFAULT_COMPANY_ID },
      create: { companyId: DEFAULT_COMPANY_ID, ...saved },
      update: saved,
    });
  }

  private findConnection() {
    return this.prisma.googleCalendarConnection.findUnique({
      where: { companyId: DEFAULT_COMPANY_ID },
    });
  }

  // O "state" prova que o retorno do Google começou com um pedido de um usuário do sistema.
  private createState(userId: string): string {
    const payload = `${userId}.${Date.now() + STATE_TTL_MS}`;
    return `${payload}.${this.sign(payload)}`;
  }

  private readState(state: string): string {
    const [userId, expiresAt, signature] = state.split('.');
    const expected = Buffer.from(this.sign(`${userId}.${expiresAt}`));
    const received = Buffer.from(signature ?? '');
    const valid =
      received.length === expected.length &&
      timingSafeEqual(received, expected) &&
      Number(expiresAt) > Date.now();
    if (!valid) {
      throw new BadRequestException('Pedido de conexão inválido ou expirado.');
    }
    return userId;
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.secretKey())
      .update(`google-oauth:${payload}`)
      .digest('base64url');
  }

  private oauthSettings() {
    const clientId = this.read('GOOGLE_CLIENT_ID');
    const clientSecret = this.read('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.read('GOOGLE_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException(
        'Falta configurar a conexão com o Google no servidor.',
      );
    }
    return { clientId, clientSecret, redirectUri };
  }

  private secretKey(): string {
    return (
      this.read('TENANT_SECRETS_KEY') ??
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET')
    );
  }

  private read(key: string) {
    const value = this.configService.get<string>(key) ?? process.env[key];
    return value?.trim() || undefined;
  }
}

// O id_token vem direto do Google na mesma resposta, então basta ler o conteúdo.
function readEmail(idToken?: string): string | null {
  const payload = idToken?.split('.')[1];
  if (!payload) return null;
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
    email?: string;
  };
  return claims.email ?? null;
}
