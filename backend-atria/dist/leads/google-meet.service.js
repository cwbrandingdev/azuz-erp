"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var GoogleMeetService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleMeetService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars';
const MEET_SPACES_URL = 'https://meet.googleapis.com/v2/spaces';
let GoogleMeetService = GoogleMeetService_1 = class GoogleMeetService {
    configService;
    logger = new common_1.Logger(GoogleMeetService_1.name);
    accessToken = null;
    accessTokenExpiresAt = 0;
    constructor(configService) {
        this.configService = configService;
    }
    isConfigured() {
        return Boolean(this.read('GOOGLE_CLIENT_ID') &&
            this.read('GOOGLE_CLIENT_SECRET') &&
            this.read('GOOGLE_REFRESH_TOKEN'));
    }
    async createMeeting(input) {
        const token = await this.getAccessToken();
        const calendarId = this.read('GOOGLE_CALENDAR_ID') || 'primary';
        const email = normalizeEmail(input.guestEmail);
        const timeZone = 'America/Sao_Paulo';
        const meetUrl = await this.createOpenSpace(token);
        try {
            await axios_1.default.post(`${CALENDAR_EVENTS_URL}/${encodeURIComponent(calendarId)}/events`, {
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
            }, {
                params: email ? { sendUpdates: 'all' } : undefined,
                headers: { Authorization: `Bearer ${token}` },
                timeout: 20_000,
            });
        }
        catch (error) {
            const message = readGoogleError(error);
            this.logger.warn(`Falha ao criar o evento no Google Calendar: ${message}`);
            throw new common_1.BadGatewayException(message || 'Não foi possível criar o evento no Google Calendar.');
        }
        return meetUrl;
    }
    async createOpenSpace(token) {
        try {
            const response = await axios_1.default.post(MEET_SPACES_URL, { config: { accessType: 'OPEN' } }, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 20_000,
            });
            const meetUrl = response.data?.meetingUri;
            if (!meetUrl) {
                throw new common_1.BadGatewayException('O Google não devolveu o link da reunião.');
            }
            return meetUrl;
        }
        catch (error) {
            if (error instanceof common_1.BadGatewayException)
                throw error;
            const message = readGoogleError(error);
            this.logger.warn(`Falha ao criar a sala do Google Meet: ${message}`);
            if (isMissingMeetPermission(message)) {
                throw new common_1.BadGatewayException('Autorize o Google Meet de novo para criar reuniões abertas.');
            }
            throw new common_1.BadGatewayException(message || 'Não foi possível criar a reunião no Google Meet.');
        }
    }
    async getAccessToken() {
        if (this.accessToken && Date.now() < this.accessTokenExpiresAt) {
            return this.accessToken;
        }
        const clientId = this.read('GOOGLE_CLIENT_ID');
        const clientSecret = this.read('GOOGLE_CLIENT_SECRET');
        const refreshToken = this.read('GOOGLE_REFRESH_TOKEN');
        if (!clientId || !clientSecret || !refreshToken) {
            throw new common_1.BadGatewayException('O Google Calendar não está conectado.');
        }
        try {
            const response = await axios_1.default.post(TOKEN_URL, new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 15_000,
            });
            const data = response.data;
            if (!data.access_token) {
                throw new common_1.BadGatewayException('O Google não devolveu um token de acesso.');
            }
            this.accessToken = data.access_token;
            const expiresIn = data.expires_in ?? 3600;
            this.accessTokenExpiresAt = Date.now() + Math.max(expiresIn - 60, 30) * 1000;
            return data.access_token;
        }
        catch (error) {
            if (error instanceof common_1.BadGatewayException)
                throw error;
            const googleError = readGoogleError(error);
            this.logger.warn(`Falha ao autenticar no Google Calendar: ${googleError}`);
            throw new common_1.BadGatewayException('Não foi possível autenticar no Google Calendar. Confira as credenciais.');
        }
    }
    read(key) {
        const value = this.configService.get(key) ?? process.env[key];
        const trimmed = value?.trim();
        return trimmed ? trimmed : undefined;
    }
};
exports.GoogleMeetService = GoogleMeetService;
exports.GoogleMeetService = GoogleMeetService = GoogleMeetService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GoogleMeetService);
function isMissingMeetPermission(message) {
    const normalized = message.toLowerCase();
    return (normalized.includes('insufficient') ||
        normalized.includes('access_denied') ||
        normalized.includes('permission') ||
        normalized.includes('scope'));
}
function normalizeEmail(value) {
    const email = value?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return undefined;
    return email;
}
function readGoogleError(error) {
    if (!axios_1.default.isAxiosError(error)) {
        return error instanceof Error ? error.message : 'erro desconhecido';
    }
    const data = error.response?.data;
    if (typeof data?.error === 'string')
        return data.error;
    if (data?.error && typeof data.error === 'object' && data.error.message) {
        return data.error.message;
    }
    return data?.error_description || error.message;
}
//# sourceMappingURL=google-meet.service.js.map