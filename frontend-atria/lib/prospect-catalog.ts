import { BRAZIL_STATES } from "@/lib/brazil-states";

export const PROSPECT_CATALOG_ALLOWED_UFS = ["SP", "PR"] as const;

export const PROSPECT_CATALOG_STATES = BRAZIL_STATES.filter((state) =>
  (PROSPECT_CATALOG_ALLOWED_UFS as readonly string[]).includes(state.uf),
);
