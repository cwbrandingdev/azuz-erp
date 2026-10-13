import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppConfig {
  constructor(private readonly configService: ConfigService) {}

  get phoneNumberId(): string {
    return (
      this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID')?.trim() ?? ''
    );
  }

  get permanentToken(): string {
    return (
      this.configService.get<string>('WHATSAPP_PERMANENT_TOKEN')?.trim() ||
      this.configService.get<string>('WHATSAPP_ACCESS_TOKEN')?.trim() ||
      ''
    );
  }

  get verifyToken(): string {
    return (
      this.configService.get<string>('WEBHOOK_VERIFY_TOKEN')?.trim() ?? ''
    );
  }

  get graphVersion(): string {
    return 'v23.0';
  }

  get wabaId(): string {
    return (
      this.configService.get<string>('WHATSAPP_WABA_ID')?.trim() ||
      this.configService
        .get<string>('WHATSAPP_BUSINESS_ACCOUNT_ID')
        ?.trim() ||
      ''
    );
  }

  get isConfigured(): boolean {
    return Boolean(this.phoneNumberId && this.permanentToken);
  }
}
