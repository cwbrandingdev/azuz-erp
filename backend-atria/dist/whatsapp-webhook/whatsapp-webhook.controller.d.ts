import { WhatsappWebhookService } from './whatsapp-webhook.service';
export declare class WhatsappWebhookController {
    private readonly webhookService;
    constructor(webhookService: WhatsappWebhookService);
    verifyWebhook(mode: string, token: string, challenge: string): string;
    handleWebhook(payload: any): Promise<{
        status: string;
    }>;
}
