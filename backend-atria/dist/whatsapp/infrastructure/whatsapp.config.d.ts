import { ConfigService } from '@nestjs/config';
export declare class WhatsAppConfig {
    private readonly configService;
    constructor(configService: ConfigService);
    get baseUrl(): string;
    get apiKey(): string;
    get session(): string;
    get webhookUrl(): string;
    get webhookHmacKey(): string;
    get isConfigured(): boolean;
}
