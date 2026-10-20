import type { WhatsAppMessageKind } from './whatsapp-message';

export type WhatsAppSendResult = {
  whatsappMessageId: string | null;
  to: string;
};

export type WhatsAppDownloadedMedia = {
  buffer: Buffer;
  mimeType: string;
  filename: string;
};

export type WhatsAppTemplateComponent = {
  type: string;
  text?: string;
  format?: string;
  example?: {
    body_text?: string[][];
    header_text?: string[];
  };
};

export type WhatsAppHsmTemplate = {
  name: string;
  language: string;
  status: string;
  category: string;
  components: WhatsAppTemplateComponent[];
};

export type WhatsAppInteractiveOption = {
  id: string;
  title: string;
};

export abstract class WhatsAppGraphGateway {
  abstract sendText(to: string, body: string): Promise<WhatsAppSendResult>;

  abstract sendInteractiveMenu(
    to: string,
    bodyText: string,
    options: WhatsAppInteractiveOption[],
  ): Promise<WhatsAppSendResult>;

  abstract sendMedia(
    to: string,
    kind: WhatsAppMessageKind,
    mediaId: string,
    options?: { caption?: string; filename?: string },
  ): Promise<WhatsAppSendResult>;

  abstract sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string,
  ): Promise<WhatsAppSendResult>;

  abstract sendTemplate(
    to: string,
    name: string,
    language: string,
    bodyParameters: string[],
  ): Promise<WhatsAppSendResult>;

  abstract uploadMedia(
    buffer: Buffer,
    mimeType: string,
    filename: string,
  ): Promise<string>;

  abstract downloadMedia(mediaId: string): Promise<WhatsAppDownloadedMedia>;

  abstract listTemplates(): Promise<WhatsAppHsmTemplate[]>;

  abstract getBusinessPhone(): Promise<string>;
}
