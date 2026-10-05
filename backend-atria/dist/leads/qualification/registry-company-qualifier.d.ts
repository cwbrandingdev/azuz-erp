export declare const CW_MIN_PACKAGE_MONTHLY = 5699;
export declare const REGISTRY_QUALIFIED_THRESHOLD = 60;
export declare const REGISTRY_OPERATIONAL_WEIGHT = 0.4;
export declare const REGISTRY_COMMERCIAL_WEIGHT = 0.6;
export type RegistryFitVerdict = 'high' | 'medium' | 'low' | 'do_not_prioritize';
export interface RegistryCompanyInput {
    name: string;
    category?: string | null;
    phone?: string | null;
    email?: string | null;
    shareCapital?: number | null;
    isMei?: boolean;
    companySize?: string | null;
}
export interface RegistryQualificationResult {
    registryScore: number;
    commercialScore: number;
    blendedScore: number;
    verdict: RegistryFitVerdict;
    qualified: boolean;
    segmentLabel: string;
    notes: string;
    commercialFit: {
        segmentLabel: string;
        estimatedMonthlyRevenueMax: number | null;
        estimatedRevenueBand: string;
        minPackageMonthly: number;
        packageSharePercent: number | null;
        affordability: 'high' | 'medium' | 'low';
        verdict: RegistryFitVerdict;
        recommendedAction: 'prioritize' | 'nurture' | 'do_not_prioritize';
        commercialScore: number;
        confidence: 'high' | 'medium' | 'low';
        summary: string;
        revenueJustification: string;
        shareCapital: number | null;
        usedAi: boolean;
        matchedRuleId?: string;
        assessedAt: string;
    };
}
export declare function qualifyRegistryCompany(input: RegistryCompanyInput): RegistryQualificationResult;
