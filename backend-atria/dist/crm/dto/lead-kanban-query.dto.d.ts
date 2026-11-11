import { ProspectingLeadsQueryDto } from './prospecting-leads-query.dto';
export declare const KANBAN_SEARCH_MAX_LENGTH = 200;
export declare class LeadKanbanQueryDto extends ProspectingLeadsQueryDto {
    search?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
}
export declare class LeadKanbanColumnQueryDto extends LeadKanbanQueryDto {
    offset?: number;
}
