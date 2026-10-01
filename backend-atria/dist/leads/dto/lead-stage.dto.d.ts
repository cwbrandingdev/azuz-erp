export declare class LeadStagesQueryDto {
    organizationId?: string;
}
export declare class CreateLeadStageDto {
    name: string;
    color?: string;
    order?: number;
    organizationId?: string;
}
export declare class UpdateLeadStageDto {
    name?: string;
    color?: string;
    order?: number;
}
export declare class ReorderLeadStagesDto {
    ids: string[];
    organizationId?: string;
}
