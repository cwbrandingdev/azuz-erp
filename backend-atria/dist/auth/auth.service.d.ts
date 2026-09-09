import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateInvitationTokenDto } from './dto/create-invitation-token.dto';
import { SignupWithTokenDto } from './dto/signup-with-token.dto';
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
export interface UserResponse {
    id: string;
    name: string;
    email: string;
    role: string;
    category: 'MEMBER' | 'CLIENT';
    avatarUrl: string | null;
    clientId?: string | null;
    companyId?: string | null;
    tenantId?: string | null;
    mustChangePassword?: boolean;
    isActive?: boolean;
    permissions?: string[];
    hasCrmEnabled?: boolean;
}
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly configService;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService);
    register(_dto: RegisterDto): Promise<void>;
    signupWithToken(dto: SignupWithTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: UserResponse;
    }>;
    validateInvitationToken(token: string): Promise<{
        valid: boolean;
        role: import("@prisma/client").$Enums.RoleName;
        companyId: string;
        companyName: string;
        expiresAt: string;
    }>;
    createInvitationToken(createdByUserId: string, dto: CreateInvitationTokenDto): Promise<{
        id: string;
        token: string;
        role: import("@prisma/client").$Enums.RoleName;
        companyId: string;
        used: boolean;
        expiresAt: string;
    }>;
    private resolveUserCategory;
    private assertUserIsActive;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: UserResponse;
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: UserResponse;
    }>;
    logout(refreshToken: string): Promise<void>;
    getProfile(userId: string): Promise<UserResponse>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<{
        success: boolean;
    }>;
    private generateTokens;
    private storeRefreshToken;
    private hashToken;
    private getRefreshExpirationDate;
    private toUserResponse;
    generateSecureToken(): string;
}
