import { type RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { WhatsappService } from './whatsapp.service';
export declare class WhatsappWebhookController {
    private readonly whatsappService;
    constructor(whatsappService: WhatsappService);
    verify(query: Record<string, unknown>, res: Response): Promise<void>;
    handle(req: RawBodyRequest<Request>): Promise<{
        received: boolean;
    }>;
}
