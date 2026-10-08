import { type AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { WhatsAppCallingService } from '../application/whatsapp-calling.service';
import { WhatsAppService } from '../application/whatsapp.service';
import { AnswerWhatsAppCallDto } from './dto/answer-whatsapp-call.dto';
import { CreateCannedResponseDto } from './dto/create-canned-response.dto';
import { CreateWhatsAppNoteDto } from './dto/create-whatsapp-note.dto';
import { InitiateWhatsAppCallDto } from './dto/initiate-whatsapp-call.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';
import { SendWhatsAppMessageDto } from './dto/send-whatsapp-message.dto';
import { UpdateWhatsAppConversationDto } from './dto/update-whatsapp-conversation.dto';
export declare class WhatsAppController {
    private readonly whatsAppService;
    private readonly calling;
    constructor(whatsAppService: WhatsAppService, calling: WhatsAppCallingService);
    send(user: AuthenticatedUser, dto: SendWhatsAppMessageDto): Promise<import("../domain/whatsapp-message").WhatsAppMessageRecord>;
    listConversations(user: AuthenticatedUser, query: QueryConversationsDto): Promise<import("../domain/whatsapp-message").WhatsAppConversationSummary[]>;
    getConversation(phone: string): Promise<import("../domain/whatsapp-message").WhatsAppConversationSummary | null>;
    updateConversation(phone: string, dto: UpdateWhatsAppConversationDto): Promise<import("../domain/whatsapp-message").WhatsAppConversationSummary>;
    addNote(user: AuthenticatedUser, phone: string, dto: CreateWhatsAppNoteDto): Promise<import("../domain/whatsapp-message").WhatsAppMessageRecord>;
    listByPhone(phone: string): Promise<import("../domain/whatsapp-message").WhatsAppMessageRecord[]>;
    listLiveCalls(): Promise<import("../domain/whatsapp-call").WhatsAppCallRecord[]>;
    getCall(id: string): Promise<import("../domain/whatsapp-call").WhatsAppCallRecord>;
    initiateCall(user: AuthenticatedUser, dto: InitiateWhatsAppCallDto): Promise<import("../domain/whatsapp-call").WhatsAppCallRecord>;
    answerCall(id: string, dto: AnswerWhatsAppCallDto): Promise<import("../domain/whatsapp-call").WhatsAppCallRecord>;
    rejectCall(id: string): Promise<import("../domain/whatsapp-call").WhatsAppCallRecord>;
    hangupCall(id: string): Promise<import("../domain/whatsapp-call").WhatsAppCallRecord>;
    getCallPermissions(phone: string): Promise<import("../domain/whatsapp-call").WhatsAppCallPermission>;
    requestCallPermission(user: AuthenticatedUser, phone: string): Promise<{
        alreadyGranted: boolean;
        permissions: import("../domain/whatsapp-graph.gateway").WhatsAppCallPermissionsResult;
    }>;
    listCannedResponses(): Promise<import("../domain/whatsapp-message").WhatsAppCannedResponseRecord[]>;
    createCannedResponse(dto: CreateCannedResponseDto): Promise<import("../domain/whatsapp-message").WhatsAppCannedResponseRecord>;
    deleteCannedResponse(id: string): Promise<void>;
}
