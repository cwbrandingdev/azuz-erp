import { ConfigService } from '@nestjs/config';
export declare class WhatsappWebhookService {
    private readonly configService;
    constructor(configService: ConfigService);
    verifyWebhook(mode: string, token: string, challenge: string): string;
    handleIncomingPayload(payload: any): void;
    private processMessage;
    private processStatus;
}
