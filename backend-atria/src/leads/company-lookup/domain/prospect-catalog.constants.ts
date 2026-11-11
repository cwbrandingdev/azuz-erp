/** UFs present in the ingested Receita prospect catalog. */
export const PROSPECT_CATALOG_ALLOWED_UFS = ['SP', 'PR'] as const;

export type ProspectCatalogAllowedUf =
  (typeof PROSPECT_CATALOG_ALLOWED_UFS)[number];

export function isProspectCatalogAllowedUf(
  uf: string,
): uf is ProspectCatalogAllowedUf {
  const normalized = uf.trim().toUpperCase();
  return (PROSPECT_CATALOG_ALLOWED_UFS as readonly string[]).includes(
    normalized,
  );
}
