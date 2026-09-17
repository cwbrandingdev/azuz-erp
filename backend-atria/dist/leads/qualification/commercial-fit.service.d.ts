import { ConfigService } from '@nestjs/config';
import { Lead } from '@prisma/client';
import { AiService } from '../../ai/ai.service';
import type { InstagramProfileQualificationData } from './instagram-apify.enricher';
export declare const CW_MIN_PACKAGE_MONTHLY = 5699;
export type CommercialFitVerdict = 'high' | 'medium' | 'low' | 'do_not_prioritize';
export type CommercialFitAffordability = 'high' | 'medium' | 'low';
export interface CommercialFitResult {
    segmentLabel: string;
    estimatedMonthlyRevenueMax: number | null;
    estimatedRevenueBand: string;
    minPackageMonthly: number;
    packageSharePercent: number | null;
    affordability: CommercialFitAffordability;
    verdict: CommercialFitVerdict;
    recommendedAction: 'prioritize' | 'nurture' | 'do_not_prioritize';
    commercialScore: number;
    confidence: 'high' | 'medium' | 'low';
    summary: string;
    revenueJustification: string;
    shareCapital: number | null;
    usedAi: boolean;
    matchedRuleId?: string;
}
export declare class CommercialFitService {
    private readonly aiService;
    private readonly configService;
    constructor(aiService: AiService, configService: ConfigService);
    assess(lead: Lead, instagram: InstagramProfileQualificationData | null): Promise<CommercialFitResult>;
    private buildCorpus;
    private matchRules;
    private fromRule;
    private fromHeuristics;
    private applyShareCapitalAdjustments;
    private buildShareCapitalJustification;
    private formatMoney;
    private buildRuleRevenueJustification;
    private collectFitSignals;
    private mergeAiResult;
    private affordabilityFromShare;
    private verdictToAction;
    private actionToVerdict;
    private verdictToScore;
    private buildSummary;
}
