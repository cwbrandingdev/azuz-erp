export declare enum B2bLeadSearchQueryType {
    NICHO = "NICHO",
    CNAE = "CNAE"
}
export declare class B2bLeadSearchDto {
    queryType: B2bLeadSearchQueryType;
    queryValue: string;
    city: string;
    uf: string;
    address?: string;
    maxResults?: number;
}
