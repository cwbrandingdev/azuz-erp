import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateLeadCallDto } from './dto/create-lead-call.dto';
import { ListLeadCallsQueryDto } from './dto/list-lead-calls.query';
import { UpdateLeadCallDto } from './dto/update-lead-call.dto';
import { VoiceService } from './voice.service';
export declare class VoiceController {
    private readonly voiceService;
    constructor(voiceService: VoiceService);
    getConfig(): {
        configured: boolean;
        mode: "native" | "twilio";
        callerId: string | null;
    };
    createToken(user: AuthenticatedUser): {
        token: string;
        identity: string;
        ttl: number;
        callerId: string;
    };
    listCalls(user: AuthenticatedUser, query: ListLeadCallsQueryDto): Promise<{
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
    startCall(user: AuthenticatedUser, dto: CreateLeadCallDto): Promise<{
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
    updateCall(user: AuthenticatedUser, id: string, dto: UpdateLeadCallDto): Promise<{
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
}
