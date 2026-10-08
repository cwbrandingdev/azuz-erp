import { apiRequest } from "./api";

export type WhatsAppMessageDirection = "INBOUND" | "OUTBOUND";
export type WhatsAppMessageStatus = "SENT" | "DELIVERED" | "READ" | "FAILED";
export type WhatsAppInboxStatus = "OPEN" | "PENDING" | "RESOLVED" | "SNOOZED";
export type WhatsAppInboxPriority = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type WhatsAppAssigneeFilter = "mine" | "unassigned" | "all";

export interface WhatsAppAssignedUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface WhatsAppMessage {
  id: string;
  whatsappMessageId: string | null;
  fromPhone: string;
  toPhone: string;
  body: string;
  direction: WhatsAppMessageDirection;
  status: WhatsAppMessageStatus;
  isPrivate: boolean;
  sentByUserId: string | null;
  sentByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppConversation {
  id: string;
  phone: string;
  name: string | null;
  status: WhatsAppInboxStatus;
  priority: WhatsAppInboxPriority;
  labels: string[];
  unreadCount: number;
  lastMessage: string | null;
  lastMessageAt: string;
  direction: WhatsAppMessageDirection | null;
  assignedUser: WhatsAppAssignedUser | null;
}

export interface WhatsAppCannedResponse {
  id: string;
  shortCode: string;
  title: string;
  content: string;
}

export async function listConversations(params?: {
  status?: WhatsAppInboxStatus;
  assignee?: WhatsAppAssigneeFilter;
  q?: string;
}): Promise<WhatsAppConversation[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.assignee) search.set("assignee", params.assignee);
  if (params?.q) search.set("q", params.q);
  const query = search.toString();
  return apiRequest<WhatsAppConversation[]>(
    `/whatsapp/conversations${query ? `?${query}` : ""}`,
  );
}

export async function getMessages(phone: string): Promise<WhatsAppMessage[]> {
  return apiRequest<WhatsAppMessage[]>(
    `/whatsapp/messages/${encodeURIComponent(phone)}`,
  );
}

export async function sendMessage(data: {
  to: string;
  message: string;
}): Promise<WhatsAppMessage> {
  return apiRequest<WhatsAppMessage>("/whatsapp/send", {
    method: "POST",
    body: data,
  });
}

export async function addPrivateNote(
  phone: string,
  message: string,
): Promise<WhatsAppMessage> {
  return apiRequest<WhatsAppMessage>(
    `/whatsapp/conversations/${encodeURIComponent(phone)}/notes`,
    {
      method: "POST",
      body: { message },
    },
  );
}

export async function updateConversation(
  phone: string,
  data: {
    name?: string;
    status?: WhatsAppInboxStatus;
    priority?: WhatsAppInboxPriority;
    assignedUserId?: string | null;
    labels?: string[];
  },
): Promise<WhatsAppConversation> {
  return apiRequest<WhatsAppConversation>(
    `/whatsapp/conversations/${encodeURIComponent(phone)}`,
    {
      method: "PATCH",
      body: data,
    },
  );
}

export async function listCannedResponses(): Promise<WhatsAppCannedResponse[]> {
  return apiRequest<WhatsAppCannedResponse[]>("/whatsapp/canned-responses");
}

export async function createCannedResponse(data: {
  shortCode: string;
  title: string;
  content: string;
}): Promise<WhatsAppCannedResponse> {
  return apiRequest<WhatsAppCannedResponse>("/whatsapp/canned-responses", {
    method: "POST",
    body: data,
  });
}

export type WhatsAppCallDirection = "INBOUND" | "OUTBOUND";
export type WhatsAppCallStatus =
  | "CONNECTING"
  | "RINGING"
  | "IN_PROGRESS"
  | "ENDED"
  | "REJECTED"
  | "FAILED";

export interface WhatsAppCall {
  id: string;
  whatsappCallId: string;
  phone: string;
  direction: WhatsAppCallDirection;
  status: WhatsAppCallStatus;
  offerSdp: string | null;
  answerSdp: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppCallPermission {
  status: string;
  expirationTime: number | null;
  canStartCall: boolean;
  canRequestPermission: boolean;
}

export async function listLiveCalls(): Promise<WhatsAppCall[]> {
  return apiRequest<WhatsAppCall[]>("/whatsapp/calls");
}

export async function initiateCall(data: {
  to: string;
  sdp: string;
}): Promise<WhatsAppCall> {
  return apiRequest<WhatsAppCall>("/whatsapp/calls", {
    method: "POST",
    body: data,
  });
}

export async function answerCall(
  id: string,
  sdp: string,
): Promise<WhatsAppCall> {
  return apiRequest<WhatsAppCall>(`/whatsapp/calls/${id}/answer`, {
    method: "POST",
    body: { sdp },
  });
}

export async function rejectCall(id: string): Promise<WhatsAppCall> {
  return apiRequest<WhatsAppCall>(`/whatsapp/calls/${id}/reject`, {
    method: "POST",
  });
}

export async function hangupCall(id: string): Promise<WhatsAppCall> {
  return apiRequest<WhatsAppCall>(`/whatsapp/calls/${id}/hangup`, {
    method: "POST",
  });
}

export async function getCallPermissions(
  phone: string,
): Promise<WhatsAppCallPermission> {
  return apiRequest<WhatsAppCallPermission>(
    `/whatsapp/call-permissions/${encodeURIComponent(phone)}`,
  );
}

export async function requestCallPermission(phone: string): Promise<{
  alreadyGranted: boolean;
  permissions: WhatsAppCallPermission;
}> {
  return apiRequest(
    `/whatsapp/call-permissions/${encodeURIComponent(phone)}`,
    { method: "POST" },
  );
}
