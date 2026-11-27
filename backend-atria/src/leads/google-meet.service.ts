import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoogleConnectionService } from './google-connection.service';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_EVENTS_URL =
  'https://www.googleapis.com/calendar/v3/calendars';
const MEET_SPACES_URL = 'https://meet.googleapis.com/v2/spaces';
const MEET_API_URL = 'https://meet.googleapis.com/v2';
const DAY_MS = 24 * 60 * 60 * 1000;

export type GoogleConnectionStatus =
  | 'connected'
  | 'revoked'
  | 'unavailable'
  | 'not_configured';

export interface GoogleMeetInput {
  title: string;
  description: string;
  guestName: string;
  guestEmails: string[];
  startAt: Date;
  endAt: Date;
}

export interface GoogleMeetResult {
  meetUrl: string;
  eventId: string;
}

export interface GoogleMeetUpdateInput {
  meetUrl: string;
  eventId: string | null;
  title: string;
  description: string;
  currentStartAt: Date;
  startAt: Date;
  endAt: Date;
  previousEmails: string[];
  guestEmails: string[];
}

export interface GoogleMeetCancelInput {
  meetUrl: string;
  eventId: string | null;
  startAt: Date;
}

@Injectable()
export class GoogleMeetService {
  private readonly logger = new Logger(GoogleMeetService.name);
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly connection: GoogleConnectionService,
  ) {}

  async isConfigured() {
    return Boolean(
      this.read('GOOGLE_CLIENT_ID') &&
        this.read('GOOGLE_CLIENT_SECRET') &&
        (await this.connection.getRefreshToken()),
    );
  }

  // Depois de reconectar, o acesso guardado ainda é o da autorização antiga.
  resetAccessToken() {
    this.accessToken = null;
    this.accessTokenExpiresAt = 0;
  }

  // Pede um token novo, sem usar o guardado, para saber se o Google ainda aceita a autorização.
  async checkConnection(): Promise<GoogleConnectionStatus> {
    if (!(await this.isConfigured())) return 'not_configured';

    try {
      await this.requestAccessToken();
      return 'connected';
    } catch (error) {
      this.logger.warn(
        `Verificação do Google Calendar falhou: ${readGoogleError(error)}`,
      );
      return isAuthorizationRejected(error) ? 'revoked' : 'unavailable';
    }
  }

  async createMeeting(input: GoogleMeetInput): Promise<GoogleMeetResult> {
    const token = await this.getAccessToken();
    const calendarId = this.read('GOOGLE_CALENDAR_ID') || 'primary';
    const emails = input.guestEmails
      .map((value) => normalizeEmail(value))
      .filter((value): value is string => Boolean(value));
    const timeZone = 'America/Sao_Paulo';
    const { meetUrl, spaceName } = await this.createPrivateSpace(token);
    await Promise.all(
      emails.map((email) => this.addMember(token, spaceName, email)),
    );

    let eventId: string | undefined;
    try {
      const response = await axios.post(
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
          ...(emails.length > 0
            ? { attendees: emails.map((email) => ({ email })) }
            : {}),
        },
        {
          params: emails.length > 0 ? { sendUpdates: 'all' } : undefined,
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20_000,
        },
      );
      eventId = response.data?.id as string | undefined;
    } catch (error) {
      const message = readGoogleError(error);
      this.logger.warn(`Falha ao criar o evento no Google Calendar: ${message}`);
      throw new BadGatewayException(
        message || 'Não foi possível criar o evento no Google Calendar.',
      );
    }

    if (!eventId) {
      throw new BadGatewayException('O Google não devolveu o id do evento.');
    }
    return { meetUrl, eventId };
  }

  private async createPrivateSpace(
    token: string,
  ): Promise<{ meetUrl: string; spaceName: string }> {
    try {
      const response = await axios.post(
        MEET_SPACES_URL,
        { config: { accessType: 'TRUSTED' } },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20_000,
        },
      );
      const meetUrl = response.data?.meetingUri as string | undefined;
      const spaceName = response.data?.name as string | undefined;
      if (!meetUrl || !spaceName) {
        throw new BadGatewayException(
          'O Google não devolveu o link da reunião.',
        );
      }
      return { meetUrl, spaceName };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      const message = readGoogleError(error);
      this.logger.warn(`Falha ao criar a sala do Google Meet: ${message}`);
      if (isMissingMeetPermission(message)) {
        throw new BadGatewayException(
          'Autorize o Google Meet de novo para criar reuniões.',
        );
      }
      throw new BadGatewayException(
        message || 'Não foi possível criar a reunião no Google Meet.',
      );
    }
  }

  private async addMember(token: string, spaceName: string, email: string) {
    try {
      await axios.post(
        `${MEET_SPACES_URL}/${spaceName.replace(/^spaces\//, '')}/members`,
        { email },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20_000,
        },
      );
    } catch (error) {
      this.logger.warn(
        `Falha ao adicionar ${email} como membro da sala: ${readGoogleError(error)}`,
      );
    }
  }

  async updateMeeting(
    input: GoogleMeetUpdateInput,
  ): Promise<{ eventId: string | null }> {
    const token = await this.getAccessToken();
    const calendarId = this.read('GOOGLE_CALENDAR_ID') || 'primary';
    const emails = normalizeEmails(input.guestEmails);
    const previousEmails = normalizeEmails(input.previousEmails);

    const eventId =
      input.eventId ??
      (await this.findEventId(
        token,
        calendarId,
        input.meetUrl,
        input.currentStartAt,
      ));

    if (eventId) {
      await this.patchEvent(token, calendarId, eventId, input, emails);
    }
    await this.syncMembers(token, input.meetUrl, previousEmails, emails);

    return { eventId };
  }

  async cancelMeeting(input: GoogleMeetCancelInput): Promise<boolean> {
    const token = await this.getAccessToken();
    const calendarId = this.read('GOOGLE_CALENDAR_ID') || 'primary';
    const eventId =
      input.eventId ??
      (await this.findEventId(token, calendarId, input.meetUrl, input.startAt));
    if (!eventId) return false;

    try {
      await axios.delete(this.eventUrl(calendarId, eventId), {
        params: { sendUpdates: 'all' },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20_000,
      });
      return true;
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : null;
      if (status === 404 || status === 410) return true;
      const message = readGoogleError(error);
      this.logger.warn(`Falha ao cancelar o evento no Google Calendar: ${message}`);
      throw new BadGatewayException(
        message || 'Não foi possível cancelar o evento no Google Calendar.',
      );
    }
  }

  private eventUrl(calendarId: string, eventId: string) {
    return `${CALENDAR_EVENTS_URL}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
  }

  private async patchEvent(
    token: string,
    calendarId: string,
    eventId: string,
    input: GoogleMeetUpdateInput,
    emails: string[],
  ) {
    const url = this.eventUrl(calendarId, eventId);
    const headers = { Authorization: `Bearer ${token}` };
    const timeZone = 'America/Sao_Paulo';

    try {
      // Mantém os convidados que continuam (com a resposta deles) e acrescenta os novos.
      const current = await axios.get(url, { headers, timeout: 20_000 });
      const existing = (current.data?.attendees ?? []) as Array<{
        email?: string;
        organizer?: boolean;
        self?: boolean;
      }>;
      const kept = existing.filter(
        (attendee) =>
          attendee.organizer ||
          attendee.self ||
          (attendee.email && emails.includes(attendee.email.toLowerCase())),
      );
      const keptEmails = new Set(
        kept.map((attendee) => attendee.email?.toLowerCase()),
      );
      const attendees = [
        ...kept,
        ...emails
          .filter((email) => !keptEmails.has(email))
          .map((email) => ({ email })),
      ];

      await axios.patch(
        url,
        {
          summary: input.title,
          description: `${input.description}\n${input.meetUrl}`,
          location: input.meetUrl,
          start: { dateTime: input.startAt.toISOString(), timeZone },
          end: { dateTime: input.endAt.toISOString(), timeZone },
          attendees,
        },
        { params: { sendUpdates: 'all' }, headers, timeout: 20_000 },
      );
    } catch (error) {
      const message = readGoogleError(error);
      this.logger.warn(`Falha ao atualizar o evento no Google Calendar: ${message}`);
      throw new BadGatewayException(
        message || 'Não foi possível atualizar o evento no Google Calendar.',
      );
    }
  }

  private async findEventId(
    token: string,
    calendarId: string,
    meetUrl: string,
    around: Date,
  ): Promise<string | null> {
    try {
      const response = await axios.get(
        `${CALENDAR_EVENTS_URL}/${encodeURIComponent(calendarId)}/events`,
        {
          params: {
            timeMin: new Date(around.getTime() - DAY_MS).toISOString(),
            timeMax: new Date(around.getTime() + DAY_MS).toISOString(),
            singleEvents: true,
            maxResults: 100,
          },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20_000,
        },
      );
      const items = (response.data?.items ?? []) as Array<{
        id?: string;
        location?: string;
        description?: string;
      }>;
      const match = items.find(
        (item) =>
          item.location === meetUrl || item.description?.includes(meetUrl),
      );
      return match?.id ?? null;
    } catch (error) {
      this.logger.warn(
        `Falha ao procurar o evento no Google Calendar: ${readGoogleError(error)}`,
      );
      return null;
    }
  }

  private async syncMembers(
    token: string,
    meetUrl: string,
    previousEmails: string[],
    emails: string[],
  ) {
    try {
      const spaceName = await this.resolveSpaceName(token, meetUrl);
      const members = await this.listMembers(token, spaceName);
      const memberEmails = new Set(members.map((member) => member.email));

      // Só remove quem era convidado desta reunião; nunca outros membros da sala.
      const toRemove = members.filter(
        (member) =>
          previousEmails.includes(member.email) &&
          !emails.includes(member.email),
      );
      const toAdd = emails.filter((email) => !memberEmails.has(email));

      await Promise.all([
        ...toAdd.map((email) => this.addMember(token, spaceName, email)),
        ...toRemove.map((member) => this.removeMember(token, member.name)),
      ]);
    } catch (error) {
      this.logger.warn(
        `Falha ao atualizar os membros da sala: ${readGoogleError(error)}`,
      );
    }
  }

  private async resolveSpaceName(token: string, meetUrl: string) {
    const code = meetUrl.split('?')[0].split('/').pop();
    const response = await axios.get(`${MEET_SPACES_URL}/${code}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20_000,
    });
    const name = response.data?.name as string | undefined;
    if (!name) throw new Error('O Google não devolveu o id da sala.');
    return name;
  }

  private async listMembers(
    token: string,
    spaceName: string,
  ): Promise<Array<{ name: string; email: string }>> {
    const response = await axios.get(`${MEET_API_URL}/${spaceName}/members`, {
      params: { pageSize: 100 },
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20_000,
    });
    const members = (response.data?.members ?? []) as Array<{
      name?: string;
      email?: string;
    }>;
    return members
      .filter((member) => member.name && member.email)
      .map((member) => ({
        name: member.name as string,
        email: (member.email as string).toLowerCase(),
      }));
  }

  private async removeMember(token: string, memberName: string) {
    try {
      await axios.delete(`${MEET_API_URL}/${memberName}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20_000,
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao remover um membro da sala: ${readGoogleError(error)}`,
      );
    }
  }

  private async getAccessToken() {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt) {
      return this.accessToken;
    }

    if (!(await this.isConfigured())) {
      throw new BadGatewayException('O Google Calendar não está conectado.');
    }

    try {
      return await this.requestAccessToken();
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      this.logger.warn(
        `Falha ao autenticar no Google Calendar: ${readGoogleError(error)}`,
      );
      throw new BadGatewayException(
        'Não foi possível autenticar no Google Calendar. Confira as credenciais.',
      );
    }
  }

  private async requestAccessToken() {
    const response = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        client_id: this.read('GOOGLE_CLIENT_ID') ?? '',
        client_secret: this.read('GOOGLE_CLIENT_SECRET') ?? '',
        refresh_token: (await this.connection.getRefreshToken()) ?? '',
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
      throw new BadGatewayException('O Google não devolveu um token de acesso.');
    }
    this.accessToken = data.access_token;
    const expiresIn = data.expires_in ?? 3600;
    this.accessTokenExpiresAt =
      Date.now() + Math.max(expiresIn - 60, 30) * 1000;
    return data.access_token;
  }

  private read(key: string) {
    const value = this.configService.get<string>(key) ?? process.env[key];
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }
}

// invalid_grant: autorização revogada ou expirada. invalid_client: ID ou secret errado.
// Nos dois casos só uma pessoa resolve.
function isAuthorizationRejected(error: unknown) {
  if (!axios.isAxiosError(error)) return false;
  const data = error.response?.data as { error?: unknown } | undefined;
  return data?.error === 'invalid_grant' || data?.error === 'invalid_client';
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

function normalizeEmails(values: string[]) {
  return [
    ...new Set(
      values
        .map((value) => normalizeEmail(value))
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase()),
    ),
  ];
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
