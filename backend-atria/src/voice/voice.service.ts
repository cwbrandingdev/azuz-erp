import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LeadCall } from '@prisma/client';
import type { Request } from 'express';
import twilio from 'twilio';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CrmScopeService } from '../leads/crm-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { maskPhone, toE164 } from './phone.util';
import { LOCKED_AGENT_OUTCOMES } from './voice.constants';

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

export interface TwilioVoiceConfig {
  accountSid: string;
  authToken: string;
  apiKeySid: string;
  apiKeySecret: string;
  twimlAppSid: string;
  callerId: string;
  webhookBaseUrl: string | null;
}

interface TwilioWebhookBody {
  [key: string]: string | undefined;
}

@Injectable()
export class VoiceService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly crmScope: CrmScopeService,
  ) {}

  getPublicConfig() {
    const mode = this.resolveDialerMode();
    const twilioConfig = this.readConfig();
    return {
      configured: true,
      mode,
      callerId: twilioConfig ? maskPhone(twilioConfig.callerId) : null,
    };
  }

  private resolveDialerMode(): 'native' | 'twilio' {
    const forced = this.config.get<string>('DIALER_MODE')?.trim();
    if (forced === 'twilio' && this.readConfig()) {
      return 'twilio';
    }
    return 'native';
  }

  createAccessToken(user: AuthenticatedUser) {
    const twilioConfig = this.requireConfig();
    const identity = this.clientIdentity(user.userId);
    const token = new AccessToken(
      twilioConfig.accountSid,
      twilioConfig.apiKeySid,
      twilioConfig.apiKeySecret,
      { identity, ttl: 3600 },
    );
    token.addGrant(
      new VoiceGrant({
        outgoingApplicationSid: twilioConfig.twimlAppSid,
        incomingAllow: false,
      }),
    );

    return {
      token: token.toJwt(),
      identity,
      ttl: 3600,
      callerId: twilioConfig.callerId,
    };
  }

  async startCall(user: AuthenticatedUser, leadId: string, notes?: string) {
    if (this.resolveDialerMode() === 'twilio') {
      this.requireConfig();
    }
    const lead = await this.findLeadForUser(user, leadId);
    const phone = toE164(lead.phone);
    if (!phone) {
      throw new BadRequestException(
        'Este lead não tem um telefone válido para discar.',
      );
    }
    if (!user.companyId) {
      throw new BadRequestException('Usuário sem empresa vinculada.');
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

  async listCalls(user: AuthenticatedUser, leadId: string) {
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

  async updateCall(
    user: AuthenticatedUser,
    callId: string,
    input: { outcome?: string; notes?: string },
  ) {
    const call = await this.prisma.leadCall.findFirst({
      where: { id: callId, userId: user.userId },
      include: { lead: { select: { name: true } } },
    });
    if (!call) {
      throw new NotFoundException('Chamada não encontrada.');
    }

    const data: {
      outcome?: string;
      notes?: string | null;
      endedAt?: Date;
      status?: string;
    } = {};

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

  async buildTwiml(req: Request): Promise<string> {
    const twilioConfig = this.readConfig();
    const response = new twilio.twiml.VoiceResponse();
    if (!twilioConfig) {
      response.say({ language: 'pt-BR' }, 'Discador não configurado.');
      response.hangup();
      return response.toString();
    }

    this.assertValidTwilioSignature(req, twilioConfig.authToken);

    const body = this.readWebhookBody(req);
    const leadCallId = body.leadCallId?.trim();
    const destination = toE164(body.To);
    const callSid = body.CallSid;

    if (!leadCallId || !destination) {
      response.say({ language: 'pt-BR' }, 'Não foi possível completar a ligação.');
      response.hangup();
      return response.toString();
    }

    const call = await this.prisma.leadCall.findUnique({
      where: { id: leadCallId },
    });
    if (!call || toE164(call.phone) !== destination) {
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
    dial.number(
      {
        statusCallback: statusUrl,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      },
      destination,
    );

    return response.toString();
  }

  async handleStatus(req: Request): Promise<void> {
    const twilioConfig = this.readConfig();
    if (!twilioConfig) return;
    this.assertValidTwilioSignature(req, twilioConfig.authToken);

    const body = this.readWebhookBody(req);
    const callSid = body.CallSid;
    const parentSid = body.ParentCallSid;
    const callStatus = (body.CallStatus || body.DialCallStatus || '').toLowerCase();
    const durationRaw = body.CallDuration || body.DialCallDuration;

    if (!callSid && !parentSid) return;

    const call = await this.prisma.leadCall.findFirst({
      where: {
        OR: [
          ...(callSid ? [{ twilioCallSid: callSid }] : []),
          ...(parentSid ? [{ twilioCallSid: parentSid }] : []),
        ],
      },
    });
    if (!call) return;

    const durationSeconds = durationRaw ? Number.parseInt(durationRaw, 10) : null;
    const twilioOutcome = this.outcomeFromTwilioStatus(callStatus);
    const shouldLockOutcome = LOCKED_AGENT_OUTCOMES.has(call.outcome);

    await this.prisma.leadCall.update({
      where: { id: call.id },
      data: {
        status: callStatus || call.status,
        durationSeconds:
          Number.isFinite(durationSeconds) && durationSeconds !== null
            ? durationSeconds
            : call.durationSeconds,
        endedAt:
          this.isTerminalStatus(callStatus) ? (call.endedAt ?? new Date()) : call.endedAt,
        outcome: shouldLockOutcome ? call.outcome : twilioOutcome ?? call.outcome,
      },
    });
  }

  private async findLeadForUser(user: AuthenticatedUser, id: string) {
    const orgFilter = await this.crmScope.buildLeadOrganizationFilter(user);
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null, ...orgFilter },
    });
    if (!lead) {
      throw new NotFoundException('Lead não encontrado.');
    }
    return lead;
  }

  private requireConfig(): TwilioVoiceConfig {
    const twilioConfig = this.readConfig();
    if (!twilioConfig) {
      throw new ServiceUnavailableException(
        'Discador Twilio não configurado. Preencha as variáveis TWILIO_* no .env do backend.',
      );
    }
    return twilioConfig;
  }

  private readConfig(): TwilioVoiceConfig | null {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID')?.trim();
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN')?.trim();
    const apiKeySid = this.config.get<string>('TWILIO_API_KEY_SID')?.trim();
    const apiKeySecret = this.config.get<string>('TWILIO_API_KEY_SECRET')?.trim();
    const twimlAppSid = this.config.get<string>('TWILIO_TWIML_APP_SID')?.trim();
    const callerId = toE164(this.config.get<string>('TWILIO_CALLER_ID')?.trim() ?? '');
    const webhookBaseUrl =
      this.config.get<string>('TWILIO_WEBHOOK_BASE_URL')?.trim().replace(/\/$/, '') ||
      null;

    if (
      !accountSid ||
      !authToken ||
      !apiKeySid ||
      !apiKeySecret ||
      !twimlAppSid ||
      !callerId
    ) {
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

  private clientIdentity(userId: string) {
    return `user_${userId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  }

  private readWebhookBody(req: Request): TwilioWebhookBody {
    const raw = req.body as Record<string, unknown> | undefined;
    if (!raw || typeof raw !== 'object') return {};
    const body: TwilioWebhookBody = {};
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'string') body[key] = value;
    }
    return body;
  }

  private assertValidTwilioSignature(req: Request, authToken: string) {
    const signature = req.header('x-twilio-signature');
    if (!signature) {
      throw new BadRequestException('Assinatura Twilio ausente.');
    }
    const valid = twilio.validateExpressRequest(req, authToken, {
      url: this.requestUrl(req),
    });
    if (!valid) {
      throw new BadRequestException('Assinatura Twilio inválida.');
    }
  }

  private requestUrl(req: Request) {
    const protoHeader = req.header('x-forwarded-proto');
    const proto = protoHeader?.split(',')[0]?.trim() || req.protocol || 'https';
    const hostHeader = req.header('x-forwarded-host') || req.header('host');
    const path = req.originalUrl.split('?')[0];
    return `${proto}://${hostHeader}${path}`;
  }

  private publicBaseUrl(req: Request, twilioConfig: TwilioVoiceConfig) {
    if (twilioConfig.webhookBaseUrl) {
      return twilioConfig.webhookBaseUrl;
    }
    return this.requestUrl(req).replace(/\/voice\/(twiml|status)$/, '');
  }

  private outcomeFromTwilioStatus(status: string): string | null {
    if (status === 'no-answer') return 'NO_ANSWER';
    if (status === 'busy') return 'BUSY';
    if (status === 'failed' || status === 'canceled') return 'FAILED';
    if (status === 'completed') return 'COMPLETED';
    return null;
  }

  private isTerminalStatus(status: string) {
    return ['completed', 'busy', 'failed', 'no-answer', 'canceled'].includes(
      status,
    );
  }

  private toCallResponse(
    call: LeadCall,
    leadName?: string,
    user?: { id: string; name: string },
  ) {
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
}
