import type { CnaeClassInfo } from '../domain/company-lookup.types';
export declare class IbgeCnaeClient {
    private readonly logger;
    private classCache;
    private subclassCache;
    listClasses(): Promise<CnaeClassInfo[]>;
    listSubclasses(): Promise<CnaeClassInfo[]>;
    private fetchCnaeList;
    private prettyDescription;
    private normalizeCnaeCode;
}
