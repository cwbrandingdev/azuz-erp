export interface WebsiteCnpjResult {
    cnpj: string | null;
    fetched: boolean;
}
export declare function findCnpjOnWebsite(website: string): Promise<WebsiteCnpjResult>;
