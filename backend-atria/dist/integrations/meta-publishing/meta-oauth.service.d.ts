import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { InstagramGraphClient } from '../instagram-insights/infrastructure/instagram-graph.client';
export declare class MetaOAuthService {
    private readonly config;
    private readonly prisma;
    private readonly graph;
    constructor(config: ConfigService, prisma: PrismaService, graph: InstagramGraphClient);
    getRequiredScopes(): string[];
    isConfigured(): boolean;
    buildAuthorizationUrl(clientId: string): Promise<string>;
    completeAuthorization(code: string, state: string): Promise<{
        clientId: string;
        instagramUsername: string | null;
    }>;
    buildFrontendSuccessRedirect(clientId: string): string;
    buildFrontendErrorRedirect(message: string): string;
    private resolveInstagramPage;
    private exchangeCodeForToken;
    private exchangeForLongLivedToken;
    private signState;
    private verifyState;
    private encryptToken;
    private appId;
    private appSecret;
    private redirectUri;
    private graphVersion;
    private graphBase;
    private frontendUrl;
    private stateSecret;
}
