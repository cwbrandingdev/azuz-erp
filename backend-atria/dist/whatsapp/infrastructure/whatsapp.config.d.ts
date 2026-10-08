import { ConfigService } from '@nestjs/config';
export declare class WhatsAppConfig {
    private readonly configService;
    constructor(configService: ConfigService);
    get phoneNumberId(): string;
    get permanentToken(): string;
    get verifyToken(): string;
    get graphVersion(): string;
    get isConfigured(): boolean;
}
