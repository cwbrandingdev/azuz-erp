import { API_BASE_URL, ApiError } from "./api";
import {
  clearPortalAuthStorage,
  getPortalAccessToken,
  getPortalRefreshToken,
  setPortalTokens,
} from "@/lib/portal-auth-storage";
import type {
  ClientReport,
  ClientPortalDeliverable,
  ClientPortalDeliverableStatus,
  CreatePortalClientRequestInput,
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
  ClientPortalFinances,
} from "./types";

async function portalRequest<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown;
  } = {},
): Promise<T> {
  const token = getPortalAccessToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 && getPortalRefreshToken()) {
    const refreshed = await refreshPortalSession();
    if (refreshed) {
      return portalRequest<T>(endpoint, options);
    }
    clearPortalAuthStorage();
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      (data as { message?: string })?.message ?? "Portal request failed",
      response.status,
      data,
    );
  }

  return data as T;
}

async function refreshPortalSession() {
  const refreshToken = getPortalRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/portal/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    setPortalTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/portal/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      (data as { message?: string })?.message ?? "Credenciais inválidas",
      response.status,
      data,
    );
  }
  return data as {
    accessToken: string;
    refreshToken: string;
    client: { id: string; companyName: string };
    mustChangePassword: boolean;
  };
}

export async function logout() {
  const refreshToken = getPortalRefreshToken();
  if (!refreshToken) return;
  await fetch(`${API_BASE_URL}/portal/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => undefined);
  clearPortalAuthStorage();
}

export async function provisionPortalAccess(
  clientId: string,
  password?: string,
) {
  const { apiRequest } = await import("./api");
  return apiRequest<{
    clientId: string;
    companyName: string;
    email: string;
    temporaryPassword: string;
    loginUrl: string;
  }>(`/portal/provision/${clientId}`, {
    method: "POST",
    body: password ? { password } : {},
  });
}

export async function getPortalData() {
  return portalRequest<PortalData>("/portal/session");
}

export async function getPortalCalendar(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return portalRequest<{
    events: Array<{
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
    }>;
    content: Array<{
      id: string;
      title: string;
      status: string;
      platform: string;
      format: string;
      scheduledDate: string;
      type: "content";
    }>;
  }>(`/portal/session/calendar${query ? `?${query}` : ""}`);
}

export async function getPortalReport(reportId: string) {
  return portalRequest<ClientReport>(`/portal/session/reports/${reportId}`);
}

export async function getPortalPost(postId: string) {
  return portalRequest<ReportContentPost & { versions?: unknown[] }>(
    `/portal/session/posts/${postId}`,
  );
}

export async function approvePortalPost(postId: string) {
  return portalRequest<ReportContentPost>(
    `/portal/session/posts/${postId}/approve`,
    { method: "PATCH" },
  );
}

export async function rejectPortalPost(postId: string, rejectionReason: string) {
  return portalRequest<ReportContentPost>(
    `/portal/session/posts/${postId}/reject`,
    {
      method: "PATCH",
      body: { rejectionReason },
    },
  );
}

export async function getPortalContract(contractId: string) {
  return portalRequest<PortalContractDetail>(
    `/portal/session/contracts/${contractId}`,
  );
}

export async function signPortalContract(contractId: string) {
  return portalRequest<unknown>(
    `/portal/session/contracts/${contractId}/sign`,
    { method: "PATCH" },
  );
}

export async function uploadPortalAsset(file: File, fileType?: string) {
  const token = getPortalAccessToken();
  const formData = new FormData();
  formData.append("file", file);
  const query = fileType ? `?fileType=${encodeURIComponent(fileType)}` : "";
  const response = await fetch(
    `${API_BASE_URL}/portal/session/assets/upload${query}`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
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
  return portalRequest<PortalBrief>("/portal/session/briefings", {
    method: "POST",
    body: data,
  });
}

export function resolvePortalAssetUrl(url: string) {
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url}`;
}

export async function listRequests(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return portalRequest<PortalClientRequest[]>(
    `/portal/session/requests${query}`,
  );
}

export async function createRequest(data: CreatePortalClientRequestInput) {
  return portalRequest<PortalClientRequest>("/portal/session/requests", {
    method: "POST",
    body: data,
  });
}

export async function addRequestComment(
  requestId: string,
  body: string,
  parentId?: string,
) {
  return portalRequest<PortalRequestComment>(
    `/portal/session/requests/${requestId}/comments`,
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
  return portalRequest<ClientPortalDeliverable[]>(
    `/portal/session/deliverables${query ? `?${query}` : ""}`,
  );
}

export async function getDeliverableFullView(id: string) {
  return portalRequest<DeliverableFullView>(
    `/portal/session/deliverables/${id}/full-view`,
  );
}

export async function reviseDeliverableItem(
  itemId: string,
  data: {
    status: DeliverableItemStatus;
    adjustmentNotes?: string | null;
  },
) {
  return portalRequest<DeliverableItem>(
    `/portal/session/deliverables/items/${itemId}/revision`,
    {
      method: "PATCH",
      body: {
        status: data.status.toUpperCase(),
        adjustmentNotes: data.adjustmentNotes,
      },
    },
  );
}

export async function listFinanceDocuments() {
  return portalRequest<PortalFinanceDocument[]>(
    "/portal/session/financial/attachments",
  );
}

export async function getFinances() {
  return portalRequest<ClientPortalFinances>("/portal/session/finances");
}

export async function uploadFinanceDocument(
  file: File,
  fileType: "invoice" | "receipt" = "receipt",
  description?: string,
) {
  const token = getPortalAccessToken();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileType", fileType);
  if (description?.trim()) {
    formData.append("description", description.trim());
  }

  const response = await fetch(
    `${API_BASE_URL}/portal/session/financial/attachments`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
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

/** @deprecated Token-based portal access */
export async function getPortalDataByToken(token: string) {
  const { apiRequest } = await import("./api");
  return apiRequest<PortalData>(`/portal/${token}`, { skipAuth: true });
}
