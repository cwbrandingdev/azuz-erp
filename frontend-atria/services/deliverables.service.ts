import JSZip from "jszip";
import {
  API_BASE_URL,
  ApiError,
  apiRequest,
  refreshAuthSession,
} from "./api";
import { clearAuthStorage, getAccessToken } from "@/lib/auth-storage";
import { withTenantHeaders } from "@/lib/tenancy/tenant-headers";
import { resolveMediaUrl } from "@/lib/media-url";
import {
  fileNameFromContentDisposition,
  triggerBlobDownload,
} from "@/lib/trigger-download";
import { showApiError, shouldShowApiErrorToast } from "@/lib/toast";
import type {
  DeliverableFullView,
  DeliverableItem,
  DeliverableItemStatus,
  DeliverableDownloadPayload,
} from "./types";

export function getFullView(id: string) {
  return apiRequest<DeliverableFullView>(`/deliverables/${id}/full-view`);
}

export function approveInternal(id: string) {
  return apiRequest<DeliverableFullView>(`/deliverables/${id}/approve-internal`, {
    method: "POST",
    body: {},
  });
}

export function approveClient(id: string) {
  return apiRequest<DeliverableFullView>(`/deliverables/${id}/approve-client`, {
    method: "POST",
    body: {},
  });
}

export function rejectClient(id: string, reason?: string) {
  return apiRequest<DeliverableFullView>(`/deliverables/${id}/reject-client`, {
    method: "POST",
    body: reason?.trim() ? { reason: reason.trim() } : {},
  });
}

export function reviseItem(
  itemId: string,
  data: {
    status: DeliverableItemStatus;
    adjustmentNotes?: string | null;
    feedbackNotes?: string | null;
  },
) {
  return apiRequest<DeliverableItem>(
    `/deliverables/items/${itemId}/revision`,
    {
      method: "PATCH",
      body: {
        status: data.status.toUpperCase(),
        adjustmentNotes: data.adjustmentNotes ?? data.feedbackNotes,
        feedbackNotes: data.feedbackNotes ?? data.adjustmentNotes,
      },
    },
  );
}

async function fetchDownloadResponse(itemId: string): Promise<Response> {
  const makeRequest = async (token: string | null) =>
    fetch(`${API_BASE_URL}/deliverables/items/${itemId}/download`, {
      method: "GET",
      credentials: "include",
      headers: withTenantHeaders({
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }),
    });

  let token = getAccessToken();
  let response = await makeRequest(token);

  if (response.status === 401) {
    const session = await refreshAuthSession();
    if (session?.accessToken) {
      token = session.accessToken;
      response = await makeRequest(token);
    } else {
      clearAuthStorage();
    }
  }

  return response;
}

function uniqueZipEntryName(usedNames: Map<string, number>, fileName: string) {
  const safeName = fileName.trim() || "arquivo";
  const count = usedNames.get(safeName) ?? 0;
  usedNames.set(safeName, count + 1);
  if (count === 0) return safeName;

  const dotIndex = safeName.lastIndexOf(".");
  if (dotIndex <= 0) {
    return `${safeName} (${count + 1})`;
  }

  const base = safeName.slice(0, dotIndex);
  const extension = safeName.slice(dotIndex);
  return `${base} (${count + 1})${extension}`;
}

async function readDownloadError(response: Response, itemId: string) {
  const data = await response.json().catch(() => null);
  const message =
    (data as { message?: string | string[] })?.message ?? "Download failed";
  const error = new ApiError(
    Array.isArray(message) ? message.join(", ") : message,
    response.status,
    data,
  );
  if (
    shouldShowApiErrorToast(
      response.status,
      `/deliverables/items/${itemId}/download`,
      error.message,
    )
  ) {
    showApiError(error, `/deliverables/items/${itemId}/download`);
  }
  throw error;
}

async function fetchItemDownload(
  itemId: string,
): Promise<{ blob: Blob; fileName: string }> {
  const response = await fetchDownloadResponse(itemId);

  if (!response.ok) {
    await readDownloadError(response, itemId);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as DeliverableDownloadPayload;
    const resolvedUrl =
      resolveMediaUrl(payload.downloadUrl) ?? payload.downloadUrl;
    const fileResponse = await fetch(resolvedUrl);
    if (!fileResponse.ok) {
      throw new ApiError(
        "Não foi possível baixar o arquivo.",
        fileResponse.status,
      );
    }
    return {
      blob: await fileResponse.blob(),
      fileName: payload.fileName?.trim() || "download",
    };
  }

  return {
    blob: await response.blob(),
    fileName: fileNameFromContentDisposition(
      response.headers.get("content-disposition"),
      "download.bin",
    ),
  };
}

export async function downloadItem(itemId: string): Promise<void> {
  const { blob, fileName } = await fetchItemDownload(itemId);
  triggerBlobDownload(blob, fileName);
}

export async function downloadAllItems(itemIds: string[]) {
  const downloadableIds = itemIds.filter(
    (itemId) => itemId && !itemId.startsWith("attachment-"),
  );
  if (downloadableIds.length === 0) return;

  if (downloadableIds.length === 1) {
    await downloadItem(downloadableIds[0]);
    return;
  }

  const zip = new JSZip();
  const usedNames = new Map<string, number>();

  for (const itemId of downloadableIds) {
    const { blob, fileName } = await fetchItemDownload(itemId);
    zip.file(uniqueZipEntryName(usedNames, fileName), blob);
  }

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  triggerBlobDownload(zipBlob, "entrega.zip");
}
