import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappWebhookService {
  constructor(private readonly configService: ConfigService) {}

  verifyWebhook(mode: string, token: string, challenge: string): string {
    const verifyToken = this.configService.get<string>('WEBHOOK_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }

    throw new UnauthorizedException('Verification failed');
  }

  handleIncomingPayload(payload: any): void {
    const entry = payload?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.messages) {
      const message = value.messages[0];
      const from = message.from;
      const text = message.text?.body;

      this.processMessage(from, text);
    }

    if (value?.statuses) {
      const status = value.statuses[0];
      const messageId = status.id;
      const statusType = status.status;

      this.processStatus(messageId, statusType);
    }
  }

  private processMessage(from: string, text: string): void {}

  private processStatus(messageId: string, status: string): void {}
}
