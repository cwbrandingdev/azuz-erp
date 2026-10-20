import { API_BASE_URL, apiRequest, uploadFile } from "./api";

export type WhatsAppMessageDirection = "INBOUND" | "OUTBOUND";
export type WhatsAppMessageStatus = "SENT" | "DELIVERED" | "READ" | "FAILED";
export type WhatsAppInboxStatus = "OPEN" | "PENDING" | "RESOLVED" | "SNOOZED";
export type WhatsAppInboxPriority = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type WhatsAppMessageKind =
  | "TEXT"
  | "IMAGE"
  | "DOCUMENT"
  | "AUDIO"
  | "VIDEO"
  | "LOCATION"
  | "TEMPLATE"
  | "STICKER";
export type WhatsAppInboxTab =
  | "OPEN"
  | "MINE"
  | "UNASSIGNED"
  | "WAITING"
  | "CLOSED";
export type WhatsAppRoutingMode =
  | "MANUAL"
  | "ROUND_ROBIN"
  | "WORKLOAD"
  | "SPECIALTY";

export interface WhatsAppAssignedUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface WhatsAppLinkedLead {
  id: string;
  name: string;
  status: string;
  source: string;
  stageId: string | null;
  stageName: string | null;
}

export interface WhatsAppMessage {
  id: string;
  whatsappMessageId: string | null;
  fromPhone: string;
  toPhone: string;
  body: string;
  kind: WhatsAppMessageKind;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaFilename: string | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  locationAddress: string | null;
  isViewOnce: boolean;
  isVoiceNote: boolean;
  transcription: string | null;
  templateName: string | null;
  templateLanguage: string | null;
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
  lastMessageStatus: WhatsAppMessageStatus | null;
  assignedUser: WhatsAppAssignedUser | null;
  queuedAt: string | null;
  assignedAt: string | null;
  lastAgentReplyAt: string | null;
  waitingSeconds: number;
  slaBreached: boolean;
  needsAgentReply: boolean;
  lead: WhatsAppLinkedLead | null;
}

export interface WhatsAppCannedResponse {
  id: string;
  shortCode: string;
  title: string;
  content: string;
  kind: WhatsAppMessageKind;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaFilename: string | null;
}

export interface WhatsAppHsmTemplate {
  name: string;
  language: string;
  status: string;
  category: string;
  components: Array<{
    type: string;
    text?: string;
    format?: string;
    example?: { body_text?: string[][]; header_text?: string[] };
  }>;
}

export interface WhatsAppInboxCounts {
  open: number;
  mine: number;
  unassigned: number;
  waiting: number;
  closed: number;
  slaBreached: number;
}

export interface WhatsAppInboxSettings {
  id: string;
  companyId: string;
  routingMode: WhatsAppRoutingMode;
  slaFirstResponseMinutes: number;
  autoReassignEnabled: boolean;
  autoReassignMinutes: number;
  agentUserIds: string[];
  botEnabled: boolean;
  aiAutoReply: boolean;
}

export interface WhatsAppRoutingRule {
  id?: string;
  matchLabel: string | null;
  matchStageId: string | null;
  matchSource: string | null;
  targetUserGroupId: string | null;
  targetUserId: string | null;
  priority: number;
}

export interface WhatsAppConversationFilters {
  tab?: WhatsAppInboxTab;
  q?: string;
  operatorId?: string;
  label?: string;
  stageId?: string;
  source?: string;
  leadStatus?: string;
}

export async function listConversations(
  params?: WhatsAppConversationFilters,
): Promise<WhatsAppConversation[]> {
  const search = new URLSearchParams();
  if (params?.tab) search.set("tab", params.tab);
  if (params?.q) search.set("q", params.q);
  if (params?.operatorId) search.set("operatorId", params.operatorId);
  if (params?.label) search.set("label", params.label);
  if (params?.stageId) search.set("stageId", params.stageId);
  if (params?.source) search.set("source", params.source);
  if (params?.leadStatus) search.set("leadStatus", params.leadStatus);
  const query = search.toString();
  return apiRequest<WhatsAppConversation[]>(
    `/whatsapp/conversations${query ? `?${query}` : ""}`,
  );
}

export async function getInboxCounts(): Promise<WhatsAppInboxCounts> {
  return apiRequest<WhatsAppInboxCounts>("/whatsapp/inbox/counts");
}

export async function getInboxSettings(): Promise<WhatsAppInboxSettings> {
  return apiRequest<WhatsAppInboxSettings>("/whatsapp/inbox/settings");
}

export async function updateInboxSettings(
  data: Partial<WhatsAppInboxSettings>,
): Promise<WhatsAppInboxSettings> {
  return apiRequest<WhatsAppInboxSettings>("/whatsapp/inbox/settings", {
    method: "PATCH",
    body: data,
  });
}

export async function listRoutingRules(): Promise<WhatsAppRoutingRule[]> {
  return apiRequest<WhatsAppRoutingRule[]>("/whatsapp/inbox/rules");
}

export async function saveRoutingRules(
  rules: WhatsAppRoutingRule[],
): Promise<WhatsAppRoutingRule[]> {
  return apiRequest<WhatsAppRoutingRule[]>("/whatsapp/inbox/rules", {
    method: "PUT",
    body: { rules },
  });
}

export async function getMessages(phone: string): Promise<WhatsAppMessage[]> {
  return apiRequest<WhatsAppMessage[]>(
    `/whatsapp/messages/${encodeURIComponent(phone)}`,
  );
}

export function whatsappMediaSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url}`;
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

export async function sendMedia(data: {
  to: string;
  file: File;
  caption?: string;
}): Promise<WhatsAppMessage> {
  const form = new FormData();
  form.append("to", data.to);
  form.append("file", data.file);
  if (data.caption) form.append("caption", data.caption);
  return uploadFile<WhatsAppMessage>("/whatsapp/send-media", form);
}

export async function sendLocation(data: {
  to: string;
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}): Promise<WhatsAppMessage> {
  return apiRequest<WhatsAppMessage>("/whatsapp/send-location", {
    method: "POST",
    body: data,
  });
}

export async function sendTemplate(data: {
  to: string;
  name: string;
  language: string;
  parameters: string[];
}): Promise<WhatsAppMessage> {
  return apiRequest<WhatsAppMessage>("/whatsapp/send-template", {
    method: "POST",
    body: data,
  });
}

export async function sendCanned(data: {
  to: string;
  cannedId: string;
}): Promise<WhatsAppMessage> {
  return apiRequest<WhatsAppMessage>("/whatsapp/send-canned", {
    method: "POST",
    body: data,
  });
}

export async function listTemplates(): Promise<WhatsAppHsmTemplate[]> {
  return apiRequest<WhatsAppHsmTemplate[]>("/whatsapp/templates");
}

export interface WhatsAppCrmContact {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  cnpj: string | null;
  jobTitle: string | null;
  source: string;
  orcamento: number | null;
  status: string;
  stageId: string | null;
  stageName: string | null;
  organizationId: string | null;
  organizationName: string | null;
}

export interface WhatsAppCrmDeal {
  id: string;
  kind: "lead" | "proposal" | "contract";
  title: string;
  status: string;
  value: number | null;
}

export interface WhatsAppCrmTimelineItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface WhatsAppCrmContext {
  contact: WhatsAppCrmContact | null;
  openDeals: WhatsAppCrmDeal[];
  timeline: WhatsAppCrmTimelineItem[];
}

export interface WhatsAppStageMessage {
  id?: string;
  stageId: string;
  stageName?: string | null;
  enabled: boolean;
  body: string | null;
  templateName: string | null;
  templateLanguage: string | null;
}

export async function getCrmContext(phone: string): Promise<WhatsAppCrmContext> {
  return apiRequest<WhatsAppCrmContext>(
    `/whatsapp/conversations/${encodeURIComponent(phone)}/crm`,
  );
}

export async function updateCrmContact(
  phone: string,
  data: Partial<
    Pick<
      WhatsAppCrmContact,
      | "name"
      | "contactName"
      | "email"
      | "cnpj"
      | "jobTitle"
      | "source"
      | "orcamento"
    >
  >,
): Promise<WhatsAppCrmContact> {
  return apiRequest<WhatsAppCrmContact>(
    `/whatsapp/conversations/${encodeURIComponent(phone)}/crm`,
    { method: "PATCH", body: data },
  );
}

export async function listStageMessages(): Promise<WhatsAppStageMessage[]> {
  return apiRequest<WhatsAppStageMessage[]>("/whatsapp/inbox/stage-messages");
}

export async function saveStageMessages(
  rules: WhatsAppStageMessage[],
): Promise<WhatsAppStageMessage[]> {
  return apiRequest<WhatsAppStageMessage[]>("/whatsapp/inbox/stage-messages", {
    method: "PUT",
    body: { rules },
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

export type WhatsAppCopilotAction =
  | "suggest"
  | "rewrite"
  | "grammar"
  | "tone"
  | "summarize";

export async function runCopilot(
  phone: string,
  data: {
    action: WhatsAppCopilotAction;
    text?: string;
    tone?: "formal" | "casual" | "empathetic";
  },
): Promise<{ text: string }> {
  return apiRequest(
    `/whatsapp/conversations/${encodeURIComponent(phone)}/copilot`,
    { method: "POST", body: data },
  );
}

export async function transferConversation(
  phone: string,
  data: {
    note: string;
    targetUserId?: string | null;
    targetUserGroupId?: string | null;
  },
): Promise<{ conversation: WhatsAppConversation; note: WhatsAppMessage }> {
  return apiRequest(
    `/whatsapp/conversations/${encodeURIComponent(phone)}/transfer`,
    { method: "POST", body: data },
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
  file?: File | null;
}): Promise<WhatsAppCannedResponse> {
  if (data.file) {
    const form = new FormData();
    form.append("shortCode", data.shortCode);
    form.append("title", data.title);
    form.append("content", data.content);
    form.append("file", data.file);
    return uploadFile<WhatsAppCannedResponse>("/whatsapp/canned-responses", form);
  }
  return apiRequest<WhatsAppCannedResponse>("/whatsapp/canned-responses", {
    method: "POST",
    body: {
      shortCode: data.shortCode,
      title: data.title,
      content: data.content,
    },
  });
}

export async function deleteCannedResponse(id: string): Promise<void> {
  await apiRequest(`/whatsapp/canned-responses/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export type WhatsAppBotNodeType =
  | "message"
  | "menu"
  | "question"
  | "ai"
  | "handoff";

export interface WhatsAppBotOption {
  key: string;
  label: string;
  nextId?: string | null;
}

export interface WhatsAppBotNode {
  id: string;
  type: WhatsAppBotNodeType;
  text?: string;
  field?: string;
  options?: WhatsAppBotOption[];
  nextId?: string | null;
}

export interface WhatsAppBotDefinition {
  startId: string;
  nodes: WhatsAppBotNode[];
}

export interface WhatsAppBotFlow {
  id: string;
  name: string;
  enabled: boolean;
  definition: WhatsAppBotDefinition;
}

export type WhatsAppBroadcastStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "RUNNING"
  | "PAUSED"
  | "DONE"
  | "FAILED";

export interface WhatsAppBroadcast {
  id: string;
  name: string;
  status: WhatsAppBroadcastStatus;
  body: string | null;
  templateName: string | null;
  templateLanguage: string | null;
  matchLabel: string | null;
  matchStageId: string | null;
  matchSource: string | null;
  matchLeadStatus: string | null;
  scheduledAt: string | null;
  ratePerMinute: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  repliedCount: number;
  failedCount: number;
  _count?: { recipients: number };
}

export type WhatsAppTriggerEvent =
  | "CART_ABANDONED"
  | "APPOINTMENT"
  | "PIX_BOLETO"
  | "POST_SALE";

export interface WhatsAppTrigger {
  id: string;
  name: string;
  enabled: boolean;
  eventType: WhatsAppTriggerEvent;
  delayMinutes: number;
  body: string | null;
  templateName: string | null;
  templateLanguage: string | null;
  matchStageId: string | null;
  matchLabel: string | null;
}

export async function listBotFlows(): Promise<WhatsAppBotFlow[]> {
  return apiRequest<WhatsAppBotFlow[]>("/whatsapp/automation/flows");
}

export async function createBotFlow(
  data: Partial<WhatsAppBotFlow>,
): Promise<WhatsAppBotFlow> {
  return apiRequest<WhatsAppBotFlow>("/whatsapp/automation/flows", {
    method: "POST",
    body: data,
  });
}

export async function updateBotFlow(
  id: string,
  data: Partial<WhatsAppBotFlow>,
): Promise<WhatsAppBotFlow> {
  const { id: _id, ...body } = data;
  return apiRequest<WhatsAppBotFlow>(
    `/whatsapp/automation/flows/${encodeURIComponent(id)}`,
    { method: "PATCH", body },
  );
}

export async function deleteBotFlow(id: string): Promise<void> {
  await apiRequest(`/whatsapp/automation/flows/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function listBroadcasts(): Promise<WhatsAppBroadcast[]> {
  return apiRequest<WhatsAppBroadcast[]>("/whatsapp/automation/broadcasts");
}

export async function createBroadcast(
  data: Partial<WhatsAppBroadcast>,
): Promise<WhatsAppBroadcast> {
  return apiRequest<WhatsAppBroadcast>("/whatsapp/automation/broadcasts", {
    method: "POST",
    body: data,
  });
}

export async function updateBroadcast(
  id: string,
  data: Partial<WhatsAppBroadcast>,
): Promise<WhatsAppBroadcast> {
  const { id: _id, ...body } = data;
  return apiRequest<WhatsAppBroadcast>(
    `/whatsapp/automation/broadcasts/${encodeURIComponent(id)}`,
    { method: "PATCH", body },
  );
}

export async function previewBroadcast(data: {
  matchLabel?: string | null;
  matchStageId?: string | null;
  matchSource?: string | null;
  matchLeadStatus?: string | null;
}): Promise<{ count: number; sample: string[] }> {
  return apiRequest("/whatsapp/automation/broadcasts/preview", {
    method: "POST",
    body: data,
  });
}

export async function startBroadcast(id: string): Promise<WhatsAppBroadcast> {
  return apiRequest(
    `/whatsapp/automation/broadcasts/${encodeURIComponent(id)}/start`,
    { method: "POST" },
  );
}

export async function pauseBroadcast(id: string): Promise<WhatsAppBroadcast> {
  return apiRequest(
    `/whatsapp/automation/broadcasts/${encodeURIComponent(id)}/pause`,
    { method: "POST" },
  );
}

export async function deleteBroadcast(id: string): Promise<void> {
  await apiRequest(
    `/whatsapp/automation/broadcasts/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export async function listTriggers(): Promise<WhatsAppTrigger[]> {
  return apiRequest<WhatsAppTrigger[]>("/whatsapp/automation/triggers");
}

export async function createTrigger(
  data: Partial<WhatsAppTrigger>,
): Promise<WhatsAppTrigger> {
  return apiRequest<WhatsAppTrigger>("/whatsapp/automation/triggers", {
    method: "POST",
    body: data,
  });
}

export async function updateTrigger(
  id: string,
  data: Partial<WhatsAppTrigger>,
): Promise<WhatsAppTrigger> {
  const { id: _id, ...body } = data;
  return apiRequest<WhatsAppTrigger>(
    `/whatsapp/automation/triggers/${encodeURIComponent(id)}`,
    { method: "PATCH", body },
  );
}

export async function deleteTrigger(id: string): Promise<void> {
  await apiRequest(`/whatsapp/automation/triggers/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function fireTrigger(data: {
  eventType: WhatsAppTriggerEvent;
  phone: string;
  entityKey?: string;
  vars?: Record<string, string>;
}): Promise<{ matched: number; sent: number }> {
  return apiRequest("/whatsapp/automation/triggers/fire", {
    method: "POST",
    body: data,
  });
}
