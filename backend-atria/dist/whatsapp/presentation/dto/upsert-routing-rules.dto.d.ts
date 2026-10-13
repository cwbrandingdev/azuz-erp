export declare class RoutingRuleItemDto {
    matchLabel?: string | null;
    matchStageId?: string | null;
    matchSource?: string | null;
    targetUserGroupId?: string | null;
    targetUserId?: string | null;
    priority?: number;
}
export declare class UpsertRoutingRulesDto {
    rules: RoutingRuleItemDto[];
}
