export declare class AddLeadToKanbanDto {
    leadId?: string;
    name?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    city?: string;
    neighborhood?: string;
    category?: string;
    placeId?: string;
    source?: string;
    organizationId?: string | null;
    stageId?: string;
}
export declare class UpdateLeadStatusDto {
    status?: string;
    stageId?: string;
    order?: number;
}
