import type { User } from "@/services/types";
import type {
  WhatsAppInboxMessage,
  WhatsAppMessage,
  WhatsAppMessageKind,
} from "@/services/whatsapp.service";

export const PENDING_MESSAGE_PREFIX = "pending:";

export function isPendingMessageId(id: string): boolean {
  return id.startsWith(PENDING_MESSAGE_PREFIX);
}

function serverFulfilledPending(
  pending: WhatsAppInboxMessage,
  server: WhatsAppMessage[],
): boolean {
  const pendingAt = new Date(pending.createdAt).getTime();
  return server.some(
    (message) =>
      message.direction === "OUTBOUND" &&
      !message.isPrivate &&
      message.body === pending.body &&
      message.sentByUserId === pending.sentByUserId &&
      Math.abs(new Date(message.createdAt).getTime() - pendingAt) < 120_000,
  );
}

export function mergeServerMessages(
  server: WhatsAppMessage[],
  current: WhatsAppInboxMessage[],
  conversationPhone: string,
): WhatsAppInboxMessage[] {
  const pendingForThread = current.filter(
    (message) =>
      isPendingMessageId(message.id) &&
      message.toPhone === conversationPhone &&
      !serverFulfilledPending(message, server),
  );
  const merged: WhatsAppInboxMessage[] = [
    ...server.map((message) => ({ ...message })),
    ...pendingForThread,
  ];
  merged.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return merged;
}

export function buildOptimisticOutboundMessage(input: {
  toPhone: string;
  body: string;
  user: User | null;
  kind?: WhatsAppMessageKind;
  mediaFilename?: string | null;
  mediaMimeType?: string | null;
}): WhatsAppInboxMessage {
  const now = new Date().toISOString();
  const id = `${PENDING_MESSAGE_PREFIX}${crypto.randomUUID()}`;
  return {
    id,
    whatsappMessageId: null,
    fromPhone: "",
    toPhone: input.toPhone,
    body: input.body,
    kind: input.kind ?? "TEXT",
    mediaUrl: null,
    mediaMimeType: input.mediaMimeType ?? null,
    mediaFilename: input.mediaFilename ?? null,
    latitude: null,
    longitude: null,
    locationName: null,
    locationAddress: null,
    isViewOnce: false,
    isVoiceNote: false,
    transcription: null,
    templateName: null,
    templateLanguage: null,
    direction: "OUTBOUND",
    status: "PENDING",
    isPrivate: false,
    sentByUserId: input.user?.id ?? null,
    sentByName: input.user?.name ?? null,
    createdAt: now,
    updatedAt: now,
  };
}