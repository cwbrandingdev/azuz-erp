import { InstagramGraphClient } from './instagram-graph.client';
export interface MetaPageAccessTokenResolveOptions {
    appId?: string | null;
    appSecret?: string | null;
    pageId?: string | null;
    instagramUserId?: string | null;
}
export interface MetaPageAccessTokenResolveResult {
    pageAccessToken: string;
    pageId: string;
    pageName: string;
    tokenType: 'PAGE' | 'USER' | 'UNKNOWN';
    convertedFromUser: boolean;
}
export declare class MetaPageAccessTokenResolver {
    private readonly graph;
    constructor(graph: InstagramGraphClient);
    resolve(inputToken: string, options?: MetaPageAccessTokenResolveOptions): Promise<MetaPageAccessTokenResolveResult>;
    private pickPage;
}
