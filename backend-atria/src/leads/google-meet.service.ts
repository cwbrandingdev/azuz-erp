import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_EVENTS_URL =
  'https://www.googleapis.com/calendar/v3/calendars';
const MEET_SPACES_URL = 'https://meet.googleapis.com/v2/spaces';

export interface GoogleMeetInput {
  title: string;
  description: string;
  guestName: string;
  guestEmail?: string;
  startAt: Date;
  endAt: Date;
}

@Injectable()
export class GoogleMeetService {
  private readonly logger = new Logger(GoogleMeetService.name);
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  constructor(private readonly configService: ConfigService) {}

  isConfigured() {
    return Boolean(
      this.read('GOOGLE_CLIENT_ID') &&
        this.read('GOOGLE_CLIENT_SECRET') &&
        this.read('GOOGLE_REFRESH_TOKEN'),
    );
  }

  async createMeeting(input: GoogleMeetInput): Promise<string> {
    const token = await this.getAccessToken();
    const calendarId = this.read('GOOGLE_CALENDAR_ID') || 'primary';
    const email = normalizeEmail(input.guestEmail);
    const timeZone = 'America/Sao_Paulo';
    const meetUrl = await this.createOpenSpace(token);

    try {
      await axios.post(
        `${CALENDAR_EVENTS_URL}/${encodeURIComponent(calendarId)}/events`,
        {
          summary: input.title,
          description: `${input.description}\n${meetUrl}`,
          location: meetUrl,
          start: {
            dateTime: input.startAt.toISOString(),
            timeZone,
          },
          end: {
            dateTime: input.endAt.toISOString(),
            timeZone,
          },
          ...(email ? { attendees: [{ email, displayName: input.guestName }] } : {}),
        },
        {
          params: email ? { sendUpdates: 'all' } : undefined,
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20_000,
        },
      );
    } catch (error) {
      const message = readGoogleError(error);
      this.logger.warn(`Falha ao criar o evento no Google Calendar: ${message}`);
      throw new BadGatewayException(
        message || 'Não foi possível criar o evento no Google Calendar.',
      );
    }

    return meetUrl;
  }

  private async createOpenSpace(token: string): Promise<string> {
    try {
      const response = await axios.post(
        MEET_SPACES_URL,
        { config: { accessType: 'OPEN' } },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20_000,
        },
      );
      const meetUrl = response.data?.meetingUri as string | undefined;
      if (!meetUrl) {
        throw new BadGatewayException(
          'O Google não devolveu o link da reunião.',
        );
      }
      return meetUrl;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      const message = readGoogleError(error);
      this.logger.warn(`Falha ao criar a sala do Google Meet: ${message}`);
      if (isMissingMeetPermission(message)) {
        throw new BadGatewayException(
          'Autorize o Google Meet de novo para criar reuniões abertas.',
        );
      }
      throw new BadGatewayException(
        message || 'Não foi possível criar a reunião no Google Meet.',
      );
    }
  }

  private async getAccessToken() {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt) {
      return this.accessToken;
    }

    const clientId = this.read('GOOGLE_CLIENT_ID');
    const clientSecret = this.read('GOOGLE_CLIENT_SECRET');
    const refreshToken = this.read('GOOGLE_REFRESH_TOKEN');
    if (!clientId || !clientSecret || !refreshToken) {
      throw new BadGatewayException(
        'O Google Calendar não está conectado.',
      );
    }

    try {
      const response = await axios.post(
        TOKEN_URL,
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15_000,
        },
      );
      const data = response.data as {
        access_token?: string;
        expires_in?: number;
      };
      if (!data.access_token) {
        throw new BadGatewayException(
          'O Google não devolveu um token de acesso.',
        );
      }
      this.accessToken = data.access_token;
      const expiresIn = data.expires_in ?? 3600;
      this.accessTokenExpiresAt = Date.now() + Math.max(expiresIn - 60, 30) * 1000;
      return data.access_token;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      const googleError = readGoogleError(error);
      this.logger.warn(
        `Falha ao autenticar no Google Calendar: ${googleError}`,
      );
      throw new BadGatewayException(
        'Não foi possível autenticar no Google Calendar. Confira as credenciais.',
      );
    }
  }

  private read(key: string) {
    const value = this.configService.get<string>(key) ?? process.env[key];
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }
}

function isMissingMeetPermission(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('insufficient') ||
    normalized.includes('access_denied') ||
    normalized.includes('permission') ||
    normalized.includes('scope')
  );
}

function normalizeEmail(value?: string | null) {
  const email = value?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return undefined;
  return email;
}

function readGoogleError(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : 'erro desconhecido';
  }
  const data = error.response?.data as
    | { error?: { message?: string } | string; error_description?: string }
    | undefined;
  if (typeof data?.error === 'string') return data.error;
  if (data?.error && typeof data.error === 'object' && data.error.message) {
    return data.error.message;
  }
  return data?.error_description || error.message;
}
