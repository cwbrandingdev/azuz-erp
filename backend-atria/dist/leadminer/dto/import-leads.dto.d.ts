export declare class LeadMinerLeadDto {
    title?: string;
    phone: string;
    address?: string;
    website?: string;
    instagram?: string;
    rating?: number;
    reviews?: number;
    category?: string;
}
export declare class ImportLeadMinerLeadsDto {
    city: string;
    neighborhood: string;
    category: string;
    leads: LeadMinerLeadDto[];
    addToKanban?: boolean;
    organizationId?: string;
}
