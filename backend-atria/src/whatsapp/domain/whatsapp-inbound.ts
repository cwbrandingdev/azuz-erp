import { kindFromMime, WhatsAppMessageKind } from './whatsapp-message';
import { normalizeWhatsAppPhone } from './whatsapp-phone';

type WahaJid = {
  User?: string;
  Server?: string;
};

function jidText(value: string | WahaJid | undefined): string | undefined {
  if (typeof value === 'string') return value;
  const user = value?.User?.trim();
  const server = value?.Server?.trim();
  if (user && server) return `${user}@${server}`;
  return undefined;
}

export type WahaInboundMessage = {
  id?: string;
  from?: string;
  fromMe?: boolean;
  body?: string;
  hasMedia?: boolean;
  pushName?: string;
  notifyName?: string;
  media?: {
    url?: string;
    mimetype?: string;
    filename?: string | null;
  } | null;
  location?: {
    latitude?: number | string;
    longitude?: number | string;
    description?: string;
    name?: string;
    address?: string;
  } | null;
  _data?: {
    notifyName?: string;
    pushName?: string;
    Info?: {
      PushName?: string;
      Sender?: string | WahaJid;
      SenderAlt?: string | WahaJid;
    };
  };
};

export type ParsedInboundMessage = {
  kind: WhatsAppMessageKind;
  body: string;
  /** Option id from a menu reply, when the engine sends one. */
  menuSelectionId: string | null;
  mediaId: string | null;
  mediaMimeType: string | null;
  mediaFilename: string | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  locationAddress: string | null;
  isViewOnce: boolean;
  isVoiceNote: boolean;
  transcription: string | null;
};

export function directChatPhone(from: string | undefined): string | null {
  const value = from?.trim() ?? '';
  if (!value || isIgnoredChat(value) || value.endsWith('@lid')) return null;
  if (
    value.endsWith('@c.us') ||
    value.endsWith('@s.whatsapp.net') ||
    /^\d+$/.test(value)
  ) {
    const phone = normalizeWhatsAppPhone(value);
    return phone || null;
  }
  return null;
}

/** GOWS often identifies a 1:1 chat as @lid. The phone is SenderAlt. */
export function inboundChatPhone(message: WahaInboundMessage): string | null {
  const from = message.from?.trim() ?? '';
  if (isIgnoredChat(from)) return null;
  const direct = directChatPhone(from);
  if (direct) return direct;
  if (!from.endsWith('@lid')) return null;
  const info = message._data?.Info;
  return (
    directChatPhone(jidText(info?.SenderAlt)) ??
    directChatPhone(jidText(info?.Sender))
  );
}

function isIgnoredChat(value: string): boolean {
  return (
    value.endsWith('@g.us') ||
    value.endsWith('@broadcast') ||
    value.includes('@newsletter')
  );
}

export function wahaContactName(message: WahaInboundMessage): string | null {
  const name =
    message.pushName?.trim() ||
    message.notifyName?.trim() ||
    message._data?.pushName?.trim() ||
    message._data?.notifyName?.trim() ||
    message._data?.Info?.PushName?.trim() ||
    '';
  return name || null;
}

export function parseWahaInbound(
  message: WahaInboundMessage,
): ParsedInboundMessage | null {
  const location = message.location;
  const latitude = numberOrNull(location?.latitude);
  const longitude = numberOrNull(location?.longitude);
  if (latitude != null && longitude != null) {
    const name = location?.name?.trim() || location?.description?.trim() || null;
    const address = location?.address?.trim() || null;
    return base({
      kind: WhatsAppMessageKind.LOCATION,
      body: name || address || `${latitude}, ${longitude}`,
      latitude,
      longitude,
      locationName: name,
      locationAddress: address,
    });
  }

  const mediaUrl = message.media?.url?.trim() || '';
  if (message.hasMedia || mediaUrl) {
    const mimeType = message.media?.mimetype?.trim() || null;
    const filename = message.media?.filename?.trim() || null;
    const kind = mimeType
      ? kindFromMime(mimeType)
      : WhatsAppMessageKind.DOCUMENT;
    const caption = message.body?.trim() || '';
    return base({
      kind,
      body:
        caption ||
        filename ||
        (kind === WhatsAppMessageKind.IMAGE
          ? 'Imagem'
          : kind === WhatsAppMessageKind.VIDEO
            ? 'Vídeo'
            : kind === WhatsAppMessageKind.AUDIO
              ? 'Áudio'
              : 'Documento'),
      mediaId: mediaUrl || null,
      mediaMimeType: mimeType,
      mediaFilename: filename,
      isVoiceNote: kind === WhatsAppMessageKind.AUDIO,
    });
  }

  const body = message.body?.trim() ?? '';
  if (!body) return null;
  return base({ kind: WhatsAppMessageKind.TEXT, body });
}

function numberOrNull(value: number | string | undefined): number | null {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function base(
  partial: Partial<ParsedInboundMessage> &
    Pick<ParsedInboundMessage, 'kind' | 'body'>,
): ParsedInboundMessage {
  return {
    menuSelectionId: null,
    mediaId: null,
    mediaMimeType: null,
    mediaFilename: null,
    latitude: null,
    longitude: null,
    locationName: null,
    locationAddress: null,
    isViewOnce: false,
    isVoiceNote: false,
    transcription: null,
    ...partial,
  };
}
