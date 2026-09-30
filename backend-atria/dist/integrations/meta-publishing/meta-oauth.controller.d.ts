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
        url: string;
    }>;
    callback(code: string, state: string, error: string, errorDescription: string, res: Response): Promise<void>;
}
