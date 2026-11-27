import { apiRequest } from "./api";

export interface GoogleCalendarStatus {
  status: "connected" | "revoked" | "unavailable" | "not_configured";
  /** system: conectado pelo botão. server: token configurado no servidor. */
  source: "system" | "server" | "none";
  accountEmail: string | null;
  connectedAt: string | null;
}

export async function getGoogleCalendarStatus() {
  return apiRequest<GoogleCalendarStatus>("/integrations/google/status", {
    skipToast: true,
  });
}

export async function getGoogleAuthorizationUrl() {
  return apiRequest<{ url: string }>("/integrations/google/auth-url");
}
