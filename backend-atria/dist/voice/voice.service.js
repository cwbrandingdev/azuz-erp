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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const twilio_1 = __importDefault(require("twilio"));
const crm_scope_service_1 = require("../leads/crm-scope.service");
const prisma_service_1 = require("../prisma/prisma.service");
const phone_util_1 = require("./phone.util");
const voice_constants_1 = require("./voice.constants");
const AccessToken = twilio_1.default.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
let VoiceService = class VoiceService {
    config;
    prisma;
    crmScope;
    constructor(config, prisma, crmScope) {
        this.config = config;
        this.prisma = prisma;
        this.crmScope = crmScope;
    }
    getPublicConfig() {
        const mode = this.resolveDialerMode();
        const twilioConfig = this.readConfig();
        return {
            configured: true,
            mode,
            callerId: twilioConfig ? (0, phone_util_1.maskPhone)(twilioConfig.callerId) : null,
        };
    }
    resolveDialerMode() {
        const forced = this.config.get('DIALER_MODE')?.trim();
        if (forced === 'twilio' && this.readConfig()) {
            return 'twilio';
        }
        return 'native';
    }
    createAccessToken(user) {
        const twilioConfig = this.requireConfig();
        const identity = this.clientIdentity(user.userId);
        const token = new AccessToken(twilioConfig.accountSid, twilioConfig.apiKeySid, twilioConfig.apiKeySecret, { identity, ttl: 3600 });
        token.addGrant(new VoiceGrant({
            outgoingApplicationSid: twilioConfig.twimlAppSid,
            incomingAllow: false,
        }));
        return {
            token: token.toJwt(),
            identity,
            ttl: 3600,
            callerId: twilioConfig.callerId,
        };
    }
    async startCall(user, leadId, notes) {
        if (this.resolveDialerMode() === 'twilio') {
            this.requireConfig();
        }
        const lead = await this.findLeadForUser(user, leadId);
        const phone = (0, phone_util_1.toE164)(lead.phone);
        if (!phone) {
            throw new common_1.BadRequestException('Este lead não tem um telefone válido para discar.');
        }
        if (!user.companyId) {
            throw new common_1.BadRequestException('Usuário sem empresa vinculada.');
        }
        const call = await this.prisma.leadCall.create({
            data: {
                companyId: user.companyId,
                leadId: lead.id,
                userId: user.userId,
                phone,
                notes: notes?.trim() || null,
                status: 'queued',
                outcome: 'INITIATED',
            },
        });
        return this.toCallResponse(call, lead.name);
    }
    async listCalls(user, leadId) {
        await this.findLeadForUser(user, leadId);
        const calls = await this.prisma.leadCall.findMany({
            where: { leadId },
            include: {
                user: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 30,
        });
        return calls.map((call) => this.toCallResponse(call, undefined, call.user));
    }
    async updateCall(user, callId, input) {
        const call = await this.prisma.leadCall.findFirst({
            where: { id: callId, userId: user.userId },
            include: { lead: { select: { name: true } } },
        });
        if (!call) {
            throw new common_1.NotFoundException('Chamada não encontrada.');
        }
        const data = {};
        if (input.outcome) {
            data.outcome = input.outcome;
            if (input.outcome !== 'INITIATED') {
                data.endedAt = call.endedAt ?? new Date();
                if (call.status === 'queued' || call.status === 'initiated') {
                    data.status = 'completed';
                }
            }
        }
        if (input.notes !== undefined) {
            data.notes = input.notes.trim() ? input.notes.trim() : null;
        }
        const updated = await this.prisma.leadCall.update({
            where: { id: call.id },
            data,
        });
        return this.toCallResponse(updated, call.lead.name);
    }
    async buildTwiml(req) {
        const twilioConfig = this.readConfig();
        const response = new twilio_1.default.twiml.VoiceResponse();
        if (!twilioConfig) {
            response.say({ language: 'pt-BR' }, 'Discador não configurado.');
            response.hangup();
            return response.toString();
        }
        this.assertValidTwilioSignature(req, twilioConfig.authToken);
        const body = this.readWebhookBody(req);
        const leadCallId = body.leadCallId?.trim();
        const destination = (0, phone_util_1.toE164)(body.To);
        const callSid = body.CallSid;
        if (!leadCallId || !destination) {
            response.say({ language: 'pt-BR' }, 'Não foi possível completar a ligação.');
            response.hangup();
            return response.toString();
        }
        const call = await this.prisma.leadCall.findUnique({
            where: { id: leadCallId },
        });
        if (!call || (0, phone_util_1.toE164)(call.phone) !== destination) {
            response.say({ language: 'pt-BR' }, 'Número não autorizado.');
            response.hangup();
            return response.toString();
        }
        await this.prisma.leadCall.update({
            where: { id: call.id },
            data: {
                twilioCallSid: callSid || call.twilioCallSid,
                status: 'initiated',
            },
        });
        const statusUrl = `${this.publicBaseUrl(req, twilioConfig)}/voice/status`;
        const dial = response.dial({
            callerId: twilioConfig.callerId,
            timeout: 25,
            answerOnBridge: true,
            action: statusUrl,
            method: 'POST',
        });
        dial.number({
            statusCallback: statusUrl,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST',
        }, destination);
        return response.toString();
    }
    async handleStatus(req) {
        const twilioConfig = this.readConfig();
        if (!twilioConfig)
            return;
        this.assertValidTwilioSignature(req, twilioConfig.authToken);
        const body = this.readWebhookBody(req);
        const callSid = body.CallSid;
        const parentSid = body.ParentCallSid;
        const callStatus = (body.CallStatus || body.DialCallStatus || '').toLowerCase();
        const durationRaw = body.CallDuration || body.DialCallDuration;
        if (!callSid && !parentSid)
            return;
        const call = await this.prisma.leadCall.findFirst({
            where: {
                OR: [
                    ...(callSid ? [{ twilioCallSid: callSid }] : []),
                    ...(parentSid ? [{ twilioCallSid: parentSid }] : []),
                ],
            },
        });
        if (!call)
            return;
        const durationSeconds = durationRaw ? Number.parseInt(durationRaw, 10) : null;
        const twilioOutcome = this.outcomeFromTwilioStatus(callStatus);
        const shouldLockOutcome = voice_constants_1.LOCKED_AGENT_OUTCOMES.has(call.outcome);
        await this.prisma.leadCall.update({
            where: { id: call.id },
            data: {
                status: callStatus || call.status,
                durationSeconds: Number.isFinite(durationSeconds) && durationSeconds !== null
                    ? durationSeconds
                    : call.durationSeconds,
                endedAt: this.isTerminalStatus(callStatus) ? (call.endedAt ?? new Date()) : call.endedAt,
                outcome: shouldLockOutcome ? call.outcome : twilioOutcome ?? call.outcome,
            },
        });
    }
    async findLeadForUser(user, id) {
        const orgFilter = await this.crmScope.buildLeadOrganizationFilter(user);
        const lead = await this.prisma.lead.findFirst({
            where: { id, deletedAt: null, ...orgFilter },
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead não encontrado.');
        }
        return lead;
    }
    requireConfig() {
        const twilioConfig = this.readConfig();
        if (!twilioConfig) {
            throw new common_1.ServiceUnavailableException('Discador Twilio não configurado. Preencha as variáveis TWILIO_* no .env do backend.');
        }
        return twilioConfig;
    }
    readConfig() {
        const accountSid = this.config.get('TWILIO_ACCOUNT_SID')?.trim();
        const authToken = this.config.get('TWILIO_AUTH_TOKEN')?.trim();
        const apiKeySid = this.config.get('TWILIO_API_KEY_SID')?.trim();
        const apiKeySecret = this.config.get('TWILIO_API_KEY_SECRET')?.trim();
        const twimlAppSid = this.config.get('TWILIO_TWIML_APP_SID')?.trim();
        const callerId = (0, phone_util_1.toE164)(this.config.get('TWILIO_CALLER_ID')?.trim() ?? '');
        const webhookBaseUrl = this.config.get('TWILIO_WEBHOOK_BASE_URL')?.trim().replace(/\/$/, '') ||
            null;
        if (!accountSid ||
            !authToken ||
            !apiKeySid ||
            !apiKeySecret ||
            !twimlAppSid ||
            !callerId) {
            return null;
        }
        return {
            accountSid,
            authToken,
            apiKeySid,
            apiKeySecret,
            twimlAppSid,
            callerId,
            webhookBaseUrl,
        };
    }
    clientIdentity(userId) {
        return `user_${userId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    }
    readWebhookBody(req) {
        const raw = req.body;
        if (!raw || typeof raw !== 'object')
            return {};
        const body = {};
        for (const [key, value] of Object.entries(raw)) {
            if (typeof value === 'string')
                body[key] = value;
        }
        return body;
    }
    assertValidTwilioSignature(req, authToken) {
        const signature = req.header('x-twilio-signature');
        if (!signature) {
            throw new common_1.BadRequestException('Assinatura Twilio ausente.');
        }
        const valid = twilio_1.default.validateExpressRequest(req, authToken, {
            url: this.requestUrl(req),
        });
        if (!valid) {
            throw new common_1.BadRequestException('Assinatura Twilio inválida.');
        }
    }
    requestUrl(req) {
        const protoHeader = req.header('x-forwarded-proto');
        const proto = protoHeader?.split(',')[0]?.trim() || req.protocol || 'https';
        const hostHeader = req.header('x-forwarded-host') || req.header('host');
        const path = req.originalUrl.split('?')[0];
        return `${proto}://${hostHeader}${path}`;
    }
    publicBaseUrl(req, twilioConfig) {
        if (twilioConfig.webhookBaseUrl) {
            return twilioConfig.webhookBaseUrl;
        }
        return this.requestUrl(req).replace(/\/voice\/(twiml|status)$/, '');
    }
    outcomeFromTwilioStatus(status) {
        if (status === 'no-answer')
            return 'NO_ANSWER';
        if (status === 'busy')
            return 'BUSY';
        if (status === 'failed' || status === 'canceled')
            return 'FAILED';
        if (status === 'completed')
            return 'COMPLETED';
        return null;
    }
    isTerminalStatus(status) {
        return ['completed', 'busy', 'failed', 'no-answer', 'canceled'].includes(status);
    }
    toCallResponse(call, leadName, user) {
        return {
            id: call.id,
            leadId: call.leadId,
            leadName: leadName ?? null,
            phone: call.phone,
            status: call.status,
            outcome: call.outcome,
            durationSeconds: call.durationSeconds,
            notes: call.notes,
            startedAt: call.startedAt.toISOString(),
            endedAt: call.endedAt?.toISOString() ?? null,
            createdAt: call.createdAt.toISOString(),
            user: user ?? null,
        };
    }
};
exports.VoiceService = VoiceService;
exports.VoiceService = VoiceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        crm_scope_service_1.CrmScopeService])
], VoiceService);
//# sourceMappingURL=voice.service.js.map