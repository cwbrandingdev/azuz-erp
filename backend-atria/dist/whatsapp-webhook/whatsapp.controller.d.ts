import { SendWhatsappMessageDto } from './dto/send-whatsapp-message.dto';
import { WhatsappWebhookService } from './whatsapp-webhook.service';
export declare class WhatsappController {
    private readonly webhookService;
    constructor(webhookService: WhatsappWebhookService);
    send(dto: SendWhatsappMessageDto): Promise<{
        id: string | null;
        to: string;
    }>;
}
