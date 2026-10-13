export declare class StageMessageItemDto {
    stageId: string;
    enabled?: boolean;
    body?: string | null;
    templateName?: string | null;
    templateLanguage?: string | null;
}
export declare class UpsertStageMessagesDto {
    rules: StageMessageItemDto[];
}
