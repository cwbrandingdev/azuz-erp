import { apiRequest } from "./api";

export async function getMetaOAuthConfig() {
  return apiRequest<{ configured: boolean; scopes: string[] }>(
    "/integrations/meta/oauth/config",
  );
}

export async function getMetaOAuthAuthorizeUrl(clientId: string) {
  return apiRequest<{ url: string }>(
    `/integrations/meta/oauth/authorize?clientId=${encodeURIComponent(clientId)}`,
  );
}
