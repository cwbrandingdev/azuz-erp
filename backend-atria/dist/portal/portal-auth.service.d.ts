import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PortalLoginDto } from './dto/portal-auth.dto';
export interface PortalJwtPayload {
    sub: string;
    clientId: string;
    email: string;
    type: 'portal';
}
export declare class PortalAuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly configService;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService);
    login(dto: PortalLoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        client: {
            id: string;
            isActive: boolean;
            companyName: string;
        };
        mustChangePassword: boolean;
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        client: {
            id: string;
            isActive: boolean;
            companyName: string;
        };
        mustChangePassword: boolean;
    }>;
    logout(refreshToken: string): Promise<void>;
    provisionPortalAccess(clientId: string, password?: string): Promise<{
        clientId: string;
        companyName: string;
        email: string;
        temporaryPassword: string;
        loginUrl: string;
    }>;
    getPortalUserFromAccessToken(token: string): Promise<{
        id: string;
        email: string;
        mustChangePassword: boolean;
        clientId: string;
    }>;
    private generateTokens;
    private storeRefreshToken;
    private hashToken;
    private getRefreshExpirationDate;
    private generateTemporaryPassword;
}
