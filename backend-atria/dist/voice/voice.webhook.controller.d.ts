import type { Request, Response } from 'express';
import { VoiceService } from './voice.service';
export declare class VoiceWebhookController {
    private readonly voiceService;
    constructor(voiceService: VoiceService);
    twiml(req: Request, res: Response): Promise<void>;
    status(req: Request, res: Response): Promise<void>;
}
