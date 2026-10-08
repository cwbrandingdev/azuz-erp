import { type AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { WhatsAppService } from '../application/whatsapp.service';
import { CreateCannedResponseDto } from './dto/create-canned-response.dto';
import { CreateWhatsAppNoteDto } from './dto/create-whatsapp-note.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';
import { SendWhatsAppMessageDto } from './dto/send-whatsapp-message.dto';
import { UpdateWhatsAppConversationDto } from './dto/update-whatsapp-conversation.dto';
export declare class WhatsAppController {
    private readonly whatsAppService;
    constructor(whatsAppService: WhatsAppService);
    send(user: AuthenticatedUser, dto: SendWhatsAppMessageDto): Promise<import("../domain/whatsapp-message").WhatsAppMessageRecord>;
    listConversations(user: AuthenticatedUser, query: QueryConversationsDto): Promise<import("../domain/whatsapp-message").WhatsAppConversationSummary[]>;
    getConversation(phone: string): Promise<import("../domain/whatsapp-message").WhatsAppConversationSummary | null>;
    updateConversation(phone: string, dto: UpdateWhatsAppConversationDto): Promise<import("../domain/whatsapp-message").WhatsAppConversationSummary>;
    addNote(user: AuthenticatedUser, phone: string, dto: CreateWhatsAppNoteDto): Promise<import("../domain/whatsapp-message").WhatsAppMessageRecord>;
    listByPhone(phone: string): Promise<import("../domain/whatsapp-message").WhatsAppMessageRecord[]>;
    listCannedResponses(): Promise<import("../domain/whatsapp-message").WhatsAppCannedResponseRecord[]>;
    createCannedResponse(dto: CreateCannedResponseDto): Promise<import("../domain/whatsapp-message").WhatsAppCannedResponseRecord>;
    deleteCannedResponse(id: string): Promise<void>;
}
