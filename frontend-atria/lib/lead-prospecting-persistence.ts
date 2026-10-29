import type { CompanySearchFormValues } from "@/components/leads/company-search-form";
import type { MapsSearchFormValues } from "@/components/leads/maps-search-form";
import type { LeadsProspectingMode } from "@/components/leads/leads-prospecting-tabs";
import type { Lead } from "@/services/types";
import type { ExternalLeadSearchContext } from "@/lib/lead-external-utils";

const B2B_STATE_KEY = "atria-leads-b2b-ui";
const MAPS_STATE_KEY = "atria-leads-maps-ui";
const MODE_KEY = "atria-leads-prospecting-mode";

export interface PersistedB2bProspectingState {
  selectedSessionId: string | null;
  formValues: CompanySearchFormValues;
}

export interface PersistedMapsProspectingState {
  formValues: MapsSearchFormValues;
  hasSearched: boolean;
  searchContext: ExternalLeadSearchContext | null;
  externalPreviewLeads: Lead[];
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / private mode
  }
}

export function readPersistedB2bProspectingState(): PersistedB2bProspectingState | null {
  return readJson<PersistedB2bProspectingState>(B2B_STATE_KEY);
}

export function writePersistedB2bProspectingState(
  state: PersistedB2bProspectingState,
) {
  writeJson(B2B_STATE_KEY, state);
}

export function readPersistedMapsProspectingState(): PersistedMapsProspectingState | null {
  return readJson<PersistedMapsProspectingState>(MAPS_STATE_KEY);
}

export function writePersistedMapsProspectingState(
  state: PersistedMapsProspectingState,
) {
  writeJson(MAPS_STATE_KEY, state);
}

export function readPersistedProspectingMode(): LeadsProspectingMode | null {
  const mode = readJson<{ mode?: LeadsProspectingMode }>(MODE_KEY)?.mode;
  return mode === "b2b" || mode === "maps" ? mode : null;
}

export function writePersistedProspectingMode(mode: LeadsProspectingMode) {
  writeJson(MODE_KEY, { mode });
}
