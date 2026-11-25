import { apiRequest } from "./api";
import type {
  MetaAdAccountsResponse,
  MetaAdsReport,
  MetaAgencyOverviewResponse,
  MetaAnalyticsQuery,
  MetaAnalyticsSummary,
  MetaCampaignsResponse,
  MetaClientInsightsResponse,
  MetaDatePreset,
} from "./types";

function buildQuery(params: MetaAnalyticsQuery = {}) {
  const search = new URLSearchParams();
  if (params.datePreset && params.datePreset !== "custom") {
    search.set("datePreset", params.datePreset);
  }
  if (params.month) search.set("month", String(params.month));
  if (params.year) search.set("year", String(params.year));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.clientId) search.set("clientId", params.clientId);
  if (params.adAccountId) search.set("adAccountId", params.adAccountId);
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function getMetaClients(search?: string) {
  return apiRequest<MetaAdAccountsResponse>(
    `/insights/clients${buildQuery({ search })}`,
  );
}

export async function getMetaAgencyOverview(params: MetaAnalyticsQuery = {}) {
  return apiRequest<MetaAgencyOverviewResponse>(
    `/insights/agency${buildQuery(params)}`,
  );
}

export async function getMetaClientInsights(
  clientId: string,
  params: MetaAnalyticsQuery = {},
) {
  return apiRequest<MetaClientInsightsResponse>(
    `/insights/client/${encodeURIComponent(clientId)}${buildQuery(params)}`,
  );
}

export async function getMetaAdsReport(
  clientId: string,
  params: MetaAnalyticsQuery = {},
) {
  return apiRequest<MetaAdsReport>(
    `/insights/client/${encodeURIComponent(clientId)}/report${buildQuery(params)}`,
    { timeoutMs: 60_000 },
  );
}

export async function getMetaClientCampaigns(
  clientId: string,
  params: MetaAnalyticsQuery = {},
) {
  return apiRequest<MetaCampaignsResponse>(
    `/insights/client/${encodeURIComponent(clientId)}/campaigns${buildQuery(params)}`,
  );
}

export async function getMetaAnalytics(
  clientId: string,
  datePreset: MetaDatePreset = "last_90d",
): Promise<MetaAnalyticsSummary> {
  const response = await getMetaClientInsights(clientId, { datePreset });
  return response.overview;
}
