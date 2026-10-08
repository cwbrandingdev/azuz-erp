export type WhatsAppSendTextResult = {
  whatsappMessageId: string | null;
  to: string;
};

export abstract class WhatsAppGraphGateway {
  abstract sendText(to: string, body: string): Promise<WhatsAppSendTextResult>;

  abstract getBusinessPhone(): Promise<string>;
}
