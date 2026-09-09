import { apiRequest, API_BASE_URL, ApiError } from "./api";
import { getAccessToken } from "@/lib/auth-storage";
import { withTenantHeaders } from "@/lib/tenancy/tenant-headers";
import type {
  ClientPortalFinances,
  ClientReport,
  CreatePortalClientRequestInput,
  ClientPortalDeliverable,
  ClientPortalDeliverableStatus,
  DeliverableFullView,
  DeliverableItem,
  DeliverableItemStatus,
  PortalBrief,
  PortalClientRequest,
  PortalContractDetail,
  PortalData,
  PortalFinanceDocument,
  PortalRequestComment,
  ReportContentPost,
  Lead,
  LeadComment,
  LeadKanbanBoard,
  UpdateLeadStatusInput,
} from "./types";

export interface ClientPortalCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  category: string;
  color: string | null;
  isPending: boolean;
  contentPostId: string | null;
  type: "event";
}

export interface ClientPortalCalendarContent {
  id: string;
  title: string;
  status: string;
  platform: string;
  format: string;
  scheduledDate: string;
  type: "content";
}

export interface ClientPortalCalendar {
  events: ClientPortalCalendarEvent[];
  content: ClientPortalCalendarContent[];
}

export async function getPortalData() {
  return apiRequest<PortalData>("/client-portal");
}

export async function getCalendar(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return apiRequest<ClientPortalCalendar>(
    `/client-portal/calendar${query ? `?${query}` : ""}`,
  );
}

export async function getPortalReport(reportId: string) {
  return apiRequest<ClientReport>(`/client-portal/reports/${reportId}`);
}

export async function getPortalPost(postId: string) {
  return apiRequest<ReportContentPost & { versions?: unknown[] }>(
    `/client-portal/posts/${postId}`,
  );
}

export async function approvePortalPost(postId: string) {
  return apiRequest<ReportContentPost>(
    `/client-portal/posts/${postId}/approve`,
    { method: "PATCH" },
  );
}

export async function rejectPortalPost(
  postId: string,
  rejectionReason: string,
) {
  return apiRequest<ReportContentPost>(
    `/client-portal/posts/${postId}/reject`,
    {
      method: "PATCH",
      body: { rejectionReason },
    },
  );
}

export async function getPortalContract(contractId: string) {
  return apiRequest<PortalContractDetail>(
    `/client-portal/contracts/${contractId}`,
  );
}

export async function signPortalContract(contractId: string) {
  return apiRequest<unknown>(`/client-portal/contracts/${contractId}/sign`, {
    method: "PATCH",
  });
}

export async function uploadPortalAsset(file: File, fileType?: string) {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append("file", file);
  const query = fileType ? `?fileType=${encodeURIComponent(fileType)}` : "";

  const response = await fetch(
    `${API_BASE_URL}/client-portal/assets/upload${query}`,
    {
      method: "POST",
      headers: withTenantHeaders(
        token ? { Authorization: `Bearer ${token}` } : {},
      ),
      body: formData,
    },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      (data as { message?: string })?.message ?? "Upload failed",
      response.status,
      data,
    );
  }
  return data as { id: string; fileName: string; fileUrl: string };
}

export async function submitPortalBriefing(data: {
  title: string;
  content: string;
}) {
  return apiRequest<PortalBrief>("/client-portal/briefings", {
    method: "POST",
    body: data,
  });
}

export async function getFinances() {
  return apiRequest<ClientPortalFinances>("/client-portal/finances");
}

export async function listFinanceDocuments() {
  return apiRequest<PortalFinanceDocument[]>(
    "/client-portal/financial/attachments",
  );
}

export async function uploadFinanceDocument(
  file: File,
  fileType: "invoice" | "receipt" = "receipt",
  description?: string,
) {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileType", fileType);
  if (description?.trim()) {
    formData.append("description", description.trim());
  }

  const response = await fetch(
    `${API_BASE_URL}/client-portal/financial/attachments`,
    {
      method: "POST",
      headers: withTenantHeaders(
        token ? { Authorization: `Bearer ${token}` } : {},
      ),
      body: formData,
    },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      (data as { message?: string })?.message ?? "Upload failed",
      response.status,
      data,
    );
  }
  return data as PortalFinanceDocument;
}

export async function listRequests(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<PortalClientRequest[]>(`/client-portal/requests${query}`);
}

export async function createRequest(data: CreatePortalClientRequestInput) {
  return apiRequest<PortalClientRequest>("/client-portal/requests", {
    method: "POST",
    body: data,
  });
}

export async function addRequestComment(
  requestId: string,
  body: string,
  parentId?: string,
) {
  return apiRequest<PortalRequestComment>(
    `/client-portal/requests/${requestId}/comments`,
    {
      method: "POST",
      body: { body, parentId },
    },
  );
}

export async function listDeliverables(params?: {
  month?: number;
  year?: number;
  status?: ClientPortalDeliverableStatus;
}) {
  const search = new URLSearchParams();
  if (params?.month) search.set("month", String(params.month));
  if (params?.year) search.set("year", String(params.year));
  if (params?.status) search.set("status", params.status);
  const query = search.toString();
  return apiRequest<ClientPortalDeliverable[]>(
    `/client-portal/deliverables${query ? `?${query}` : ""}`,
  );
}

export async function getDeliverableFullView(id: string) {
  return apiRequest<DeliverableFullView>(
    `/client-portal/deliverables/${id}/full-view`,
  );
}

export async function reviseDeliverableItem(
  itemId: string,
  data: {
    status: DeliverableItemStatus;
    adjustmentNotes?: string | null;
  },
) {
  return apiRequest<DeliverableItem>(
    `/client-portal/deliverables/items/${itemId}/revision`,
    {
      method: "PATCH",
      body: {
        status: data.status.toUpperCase(),
        adjustmentNotes: data.adjustmentNotes,
      },
    },
  );
}

export function resolvePortalAssetUrl(url: string) {
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url}`;
}

export async function getCrmKanbanBoard(): Promise<LeadKanbanBoard> {
  return apiRequest<LeadKanbanBoard>("/client-portal/crm/kanban");
}

export async function updatePortalLeadStage(
  leadId: string,
  data: UpdateLeadStatusInput,
): Promise<Lead> {
  return apiRequest<Lead>(`/client-portal/crm/leads/${leadId}/stage`, {
    method: "PATCH",
    body: data,
  });
}

export async function togglePortalLeadCollapse(
  leadId: string,
  isMinimized?: boolean,
): Promise<Lead> {
  return apiRequest<Lead>(`/client-portal/crm/leads/${leadId}/collapse`, {
    method: "PATCH",
    body: isMinimized === undefined ? {} : { isMinimized },
  });
}

export async function getPortalLeadComments(
  leadId: string,
): Promise<LeadComment[]> {
  return apiRequest<LeadComment[]>(
    `/client-portal/crm/leads/${leadId}/comments`,
  );
}

export async function createPortalLeadComment(
  leadId: string,
  content: string,
): Promise<LeadComment> {
  return apiRequest<LeadComment>(
    `/client-portal/crm/leads/${leadId}/comments`,
    {
      method: "POST",
      body: { content },
    },
  );
}
