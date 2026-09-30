import type { Response } from 'express';
import { MetaOAuthService } from './meta-oauth.service';
export declare class MetaOAuthController {
    private readonly metaOAuth;
    constructor(metaOAuth: MetaOAuthService);
    getConfig(): {
        configured: boolean;
        scopes: string[];
    };
    authorize(clientId: string): Promise<{
        url: null;
        error: string;
    } | {
        url: string;
        error?: undefined;
    }>;
    callback(code: string | undefined, state: string | undefined, errorDescription: string | undefined, res: Response): Promise<void>;
}
