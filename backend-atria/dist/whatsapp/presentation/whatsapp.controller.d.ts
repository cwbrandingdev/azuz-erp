import { WhatsAppService } from '../application/whatsapp.service';
import { SendWhatsAppMessageDto } from './dto/send-whatsapp-message.dto';
export declare class WhatsAppController {
    private readonly whatsAppService;
    constructor(whatsAppService: WhatsAppService);
    send(dto: SendWhatsAppMessageDto): Promise<import("../domain/whatsapp-message").WhatsAppMessageRecord>;
    listConversations(): Promise<import("../domain/whatsapp-message").WhatsAppConversationSummary[]>;
    listByPhone(phone: string): Promise<import("../domain/whatsapp-message").WhatsAppMessageRecord[]>;
}
