import { apiRequest } from "./api";
import type { SiteLeadsResponse } from "./types";

// Sem toast de erro: a consulta roda sozinha a cada minuto e não deve
// encher a tela de avisos se o site da CW ficar fora do ar.
export async function getSiteLeads(): Promise<SiteLeadsResponse> {
  return apiRequest<SiteLeadsResponse>("/site-leads", { skipToast: true });
}
