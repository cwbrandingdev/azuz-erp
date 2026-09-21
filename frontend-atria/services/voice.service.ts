import { apiRequest } from "./api";
import type {
  LeadCall,
  LeadCallOutcome,
  VoiceConfig,
  VoiceToken,
} from "./types";

export async function getVoiceConfig() {
  return apiRequest<VoiceConfig>("/voice/config", { skipToast: true });
}

export async function createVoiceToken() {
  return apiRequest<VoiceToken>("/voice/token", { method: "POST" });
}

export async function listLeadCalls(leadId: string) {
  const params = new URLSearchParams({ leadId });
  return apiRequest<LeadCall[]>(`/voice/calls?${params.toString()}`, {
    skipToast: true,
  });
}

export async function startLeadCall(leadId: string) {
  return apiRequest<LeadCall>("/voice/calls", {
    method: "POST",
    body: { leadId },
  });
}

export async function updateLeadCall(
  callId: string,
  data: { outcome?: LeadCallOutcome | string; notes?: string },
) {
  return apiRequest<LeadCall>(`/voice/calls/${callId}`, {
    method: "PATCH",
    body: data,
  });
}
