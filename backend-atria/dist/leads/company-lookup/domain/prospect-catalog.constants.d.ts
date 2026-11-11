export declare const PROSPECT_CATALOG_ALLOWED_UFS: readonly ["SP", "PR"];
export type ProspectCatalogAllowedUf = (typeof PROSPECT_CATALOG_ALLOWED_UFS)[number];
export declare function isProspectCatalogAllowedUf(uf: string): uf is ProspectCatalogAllowedUf;
