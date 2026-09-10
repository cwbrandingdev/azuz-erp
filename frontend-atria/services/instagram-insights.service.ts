import { apiRequest } from "./api";
import type {
  InstagramClientMetricsResponse,
  InstagramContentType,
  InstagramConversationsResponse,
  InstagramInsightClientsResponse,
} from "./types";

export async function listInstagramInsightClients() {
  return apiRequest<InstagramInsightClientsResponse>(
    "/instagram-insights/clients",
  );
}

export async function getInstagramClientMetrics(
  clientId: string,
  options: {
    contentType?: InstagramContentType;
    month?: number;
    year?: number;
  } = {},
) {
  const params = new URLSearchParams();
  if (options.contentType) {
    params.set("contentType", options.contentType);
  }
  if (options.month) {
    params.set("month", String(options.month));
  }
  if (options.year) {
    params.set("year", String(options.year));
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<InstagramClientMetricsResponse>(
    `/instagram-insights/clients/${encodeURIComponent(clientId)}${query}`,
    { skipToast: true },
  );
}

export async function listInstagramConversations(options: {
  month?: number;
  year?: number;
} = {}) {
  const params = new URLSearchParams();
  if (options.month) {
    params.set("month", String(options.month));
  }
  if (options.year) {
    params.set("year", String(options.year));
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<InstagramConversationsResponse>(
    `/instagram-insights/conversations${query}`,
    { skipToast: true },
  );
}
