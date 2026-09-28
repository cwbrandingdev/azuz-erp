import type { LeadStatus } from "@/services/types";

export const SDR_ZONE_STATUSES: LeadStatus[] = [
  "PRE_VENDA",
  "APRESENTACAO",
  "REUNIAO_AGENDADA",
  "AGUARDANDO_ENTREGA",
  "AGUARDANDO_RESPOSTA",
];

export const CLIENT_ZONE_STATUSES: LeadStatus[] = [
  "VENDA_FINALIZADA",
  "NAO_TEM_INTERESSE",
  "AGUARDANDO_RESPOSTA",
];

export type CrmMoveZone = "all" | "sdr" | "client" | "none";

export function isSdrZoneStatus(status: string): boolean {
  return SDR_ZONE_STATUSES.includes(status as LeadStatus);
}

export function isClientZoneStatus(status: string): boolean {
  return CLIENT_ZONE_STATUSES.includes(status as LeadStatus);
}

export function canMoveLeadToColumn(
  moveZone: CrmMoveZone,
  columnStatus: string,
): boolean {
  if (moveZone === "all") return true;
  if (moveZone === "sdr") return isSdrZoneStatus(columnStatus);
  if (moveZone === "client") return isClientZoneStatus(columnStatus);
  return false;
}

export function isDragDisabledForZone(
  moveZone: CrmMoveZone,
  portalClientView = false,
): boolean {
  if (portalClientView) return false;
  return moveZone !== "all";
}

export function resolveCrmMoveZoneFromRole(role: string | null | undefined): CrmMoveZone {
  const normalized = (role ?? "").trim().toLowerCase();
  if (normalized === "master" || normalized === "admin" || normalized === "client") {
    return "all";
  }
  if (normalized === "crm") return "sdr";
  if (normalized === "external_client_crm") return "client";
  return "none";
}
