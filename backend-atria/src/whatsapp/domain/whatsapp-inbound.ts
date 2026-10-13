import { WhatsAppMessageKind } from './whatsapp-message';

export type MetaInboundMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: MetaInboundMedia;
  video?: MetaInboundMedia;
  document?: MetaInboundMedia;
  audio?: MetaInboundMedia;
  sticker?: MetaInboundMedia;
  location?: {
    latitude?: number;
    longitude?: number;
    name?: string;
    address?: string;
  };
};

type MetaInboundMedia = {
  id?: string;
  mime_type?: string;
  filename?: string;
  caption?: string;
  voice?: boolean;
  view_once?: boolean;
  transcript?: string;
  transcription?: { text?: string };
};

export type ParsedInboundMessage = {
  kind: WhatsAppMessageKind;
  body: string;
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

export function parseInboundMessage(
  message: MetaInboundMessage,
): ParsedInboundMessage | null {
  const type = message.type ?? 'text';

  if (type === 'text') {
    const body = message.text?.body?.trim();
    if (!body) return null;
    return base({ kind: WhatsAppMessageKind.TEXT, body });
  }

  if (type === 'location') {
    const latitude = message.location?.latitude;
    const longitude = message.location?.longitude;
    if (latitude == null || longitude == null) return null;
    const name = message.location?.name?.trim() || null;
    const address = message.location?.address?.trim() || null;
    return base({
      kind: WhatsAppMessageKind.LOCATION,
      body: name || address || `${latitude}, ${longitude}`,
      latitude,
      longitude,
      locationName: name,
      locationAddress: address,
    });
  }

  const mediaField =
    type === 'image'
      ? message.image
      : type === 'video'
        ? message.video
        : type === 'document'
          ? message.document
          : type === 'audio'
            ? message.audio
            : type === 'sticker'
              ? message.sticker
              : undefined;

  if (!mediaField?.id) return null;

  const kind =
    type === 'image'
      ? WhatsAppMessageKind.IMAGE
      : type === 'video'
        ? WhatsAppMessageKind.VIDEO
        : type === 'document'
          ? WhatsAppMessageKind.DOCUMENT
          : type === 'audio'
            ? WhatsAppMessageKind.AUDIO
            : WhatsAppMessageKind.STICKER;

  const transcription =
    mediaField.transcript?.trim() ||
    mediaField.transcription?.text?.trim() ||
    null;
  const caption = mediaField.caption?.trim() || null;

  return base({
    kind,
    body:
      caption ||
      mediaField.filename ||
      (kind === WhatsAppMessageKind.IMAGE
        ? 'Imagem'
        : kind === WhatsAppMessageKind.VIDEO
          ? 'Vídeo'
          : kind === WhatsAppMessageKind.AUDIO
            ? 'Áudio'
            : kind === WhatsAppMessageKind.STICKER
              ? 'Figurinha'
              : 'Documento'),
    mediaId: mediaField.id,
    mediaMimeType: mediaField.mime_type ?? null,
    mediaFilename: mediaField.filename ?? null,
    isViewOnce: Boolean(mediaField.view_once),
    isVoiceNote: Boolean(mediaField.voice),
    transcription,
  });
}

function base(
  partial: Partial<ParsedInboundMessage> &
    Pick<ParsedInboundMessage, 'kind' | 'body'>,
): ParsedInboundMessage {
  return {
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
