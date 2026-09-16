import type { CnaeClassInfo } from '../domain/company-lookup.types';
export declare class IbgeCnaeClient {
    private readonly logger;
    private cache;
    listClasses(): Promise<CnaeClassInfo[]>;
    private normalizeCnaeCode;
}
