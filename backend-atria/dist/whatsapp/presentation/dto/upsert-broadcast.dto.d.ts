export declare class UpsertBroadcastDto {
    name?: string;
    body?: string | null;
    templateName?: string | null;
    templateLanguage?: string | null;
    matchLabel?: string | null;
    matchStageId?: string | null;
    matchSource?: string | null;
    matchLeadStatus?: string | null;
    scheduledAt?: string | null;
    ratePerMinute?: number;
}
export declare class PreviewBroadcastDto {
    matchLabel?: string | null;
    matchStageId?: string | null;
    matchSource?: string | null;
    matchLeadStatus?: string | null;
}
