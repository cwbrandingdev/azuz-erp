import { apiRequest } from "./api";
import type { CompanyIntegrations, CompanySettings } from "./types";

export async function getCompanySettings() {
  return apiRequest<CompanySettings>("/api/company/settings");
}

export async function updateCompanySettings(data: Partial<CompanySettings>) {
  return apiRequest<CompanySettings>("/api/company/settings", {
    method: "PATCH",
    body: data,
  });
}

export async function getCompanyIntegrations() {
  return apiRequest<CompanyIntegrations>("/api/company/integrations");
}

export async function updateCompanyIntegrations(
  data: Partial<CompanyIntegrations> & { metaPageId?: string | null },
) {
  return apiRequest<CompanyIntegrations>("/api/company/integrations", {
    method: "PATCH",
    body: data,
  });
}

export interface MetaPageTokenOption {
  id: string;
  name: string;
  instagramUserId: string | null;
}

export interface ResolveMetaPageAccessTokenResult {
  pageAccessToken: string;
  pageId: string;
  pageName: string;
  tokenType: "PAGE" | "USER" | "UNKNOWN";
  convertedFromUser: boolean;
}

export async function resolveMetaPageAccessToken(input: {
  accessToken: string;
  pageId?: string;
}) {
  return apiRequest<ResolveMetaPageAccessTokenResult>(
    "/api/company/integrations/resolve-meta-page-token",
    {
      method: "POST",
      body: input,
    },
  );
}
