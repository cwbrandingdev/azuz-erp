import { WhatsAppService } from '../application/whatsapp.service';
export declare class WhatsAppWebhookController {
    private readonly whatsAppService;
    constructor(whatsAppService: WhatsAppService);
    verifyWebhook(mode: string, token: string, challenge: string): string;
    handleWebhook(payload: unknown): Promise<{
        status: string;
    }>;
}
