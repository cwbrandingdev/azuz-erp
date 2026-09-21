import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CrmScopeService } from '../leads/crm-scope.service';
import { PrismaService } from '../prisma/prisma.service';
export interface TwilioVoiceConfig {
    accountSid: string;
    authToken: string;
    apiKeySid: string;
    apiKeySecret: string;
    twimlAppSid: string;
    callerId: string;
    webhookBaseUrl: string | null;
}
export declare class VoiceService {
    private readonly config;
    private readonly prisma;
    private readonly crmScope;
    constructor(config: ConfigService, prisma: PrismaService, crmScope: CrmScopeService);
    getPublicConfig(): {
        configured: boolean;
        mode: "native" | "twilio";
        callerId: string | null;
    };
    private resolveDialerMode;
    createAccessToken(user: AuthenticatedUser): {
        token: string;
        identity: string;
        ttl: number;
        callerId: string;
    };
    startCall(user: AuthenticatedUser, leadId: string, notes?: string): Promise<{
        id: string;
        leadId: string;
        leadName: string | null;
        phone: string;
        status: string;
        outcome: string;
        durationSeconds: number | null;
        notes: string | null;
        startedAt: string;
        endedAt: string | null;
        createdAt: string;
        user: {
            id: string;
            name: string;
        } | null;
    }>;
    listCalls(user: AuthenticatedUser, leadId: string): Promise<{
        id: string;
        leadId: string;
        leadName: string | null;
        phone: string;
        status: string;
        outcome: string;
        durationSeconds: number | null;
        notes: string | null;
        startedAt: string;
        endedAt: string | null;
        createdAt: string;
        user: {
            id: string;
            name: string;
        } | null;
    }[]>;
    updateCall(user: AuthenticatedUser, callId: string, input: {
        outcome?: string;
        notes?: string;
    }): Promise<{
        id: string;
        leadId: string;
        leadName: string | null;
        phone: string;
        status: string;
        outcome: string;
        durationSeconds: number | null;
        notes: string | null;
        startedAt: string;
        endedAt: string | null;
        createdAt: string;
        user: {
            id: string;
            name: string;
        } | null;
    }>;
    buildTwiml(req: Request): Promise<string>;
    handleStatus(req: Request): Promise<void>;
    private findLeadForUser;
    private requireConfig;
    private readConfig;
    private clientIdentity;
    private readWebhookBody;
    private assertValidTwilioSignature;
    private requestUrl;
    private publicBaseUrl;
    private outcomeFromTwilioStatus;
    private isTerminalStatus;
    private toCallResponse;
}
