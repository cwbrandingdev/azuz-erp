import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { WhatsAppService } from '../application/whatsapp.service';
import { WhatsAppConfig } from '../infrastructure/whatsapp.config';
export declare class WhatsAppWebhookController {
    private readonly whatsAppService;
    private readonly config;
    constructor(whatsAppService: WhatsAppService, config: WhatsAppConfig);
    handleWebhook(request: RawBodyRequest<Request>, payload: unknown): Promise<{
        status: string;
    }>;
    private assertSignature;
}
