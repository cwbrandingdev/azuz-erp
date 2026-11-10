import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppConfig {
  constructor(private readonly configService: ConfigService) {}

  get baseUrl(): string {
    return (
      this.configService.get<string>('WAHA_BASE_URL')?.trim() ||
      'http://127.0.0.1:3010'
    ).replace(/\/$/, '');
  }

  get apiKey(): string {
    return this.configService.get<string>('WAHA_API_KEY')?.trim() ?? '';
  }

  get session(): string {
    return this.configService.get<string>('WAHA_SESSION')?.trim() || 'default';
  }

  get webhookUrl(): string {
    return this.configService.get<string>('WAHA_WEBHOOK_URL')?.trim() ?? '';
  }

  get webhookHmacKey(): string {
    return (
      this.configService.get<string>('WAHA_WEBHOOK_HMAC_KEY')?.trim() ?? ''
    );
  }

  get isConfigured(): boolean {
    return Boolean(this.baseUrl && this.apiKey);
  }
}
