"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const company_constants_1 = require("../company/company.constants");
const tenant_constants_1 = require("../tenancy/domain/tenant.constants");
const prisma_service_1 = require("../prisma/prisma.service");
const permissions_1 = require("./constants/permissions");
const SALT_ROUNDS = 12;
let AuthService = class AuthService {
    prisma;
    jwtService;
    configService;
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async register(_dto) {
        throw new common_1.GoneException('Open registration is disabled. Use POST /auth/signup-with-token with a valid invitation token.');
    }
    async signupWithToken(dto) {
        const invitation = await this.prisma.invitationToken.findUnique({
            where: { token: dto.token },
            include: { company: { select: { id: true, status: true, tenantId: true } } },
        });
        if (!invitation || invitation.used) {
            throw new common_1.UnauthorizedException('Invalid invitation token');
        }
        if (invitation.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Invitation token has expired');
        }
        if (invitation.company.status === 'SUSPENDED') {
            throw new common_1.ForbiddenException('Company is suspended');
        }
        const companyId = invitation.companyId;
        const tenantId = invitation.tenantId ?? invitation.company.tenantId;
        const existing = await this.prisma.user.findFirst({
            where: { email: dto.email },
        });
        if (existing) {
            throw new common_1.ConflictException('Email already registered');
        }
        const role = await this.prisma.role.findUnique({
            where: { name: invitation.role },
        });
        if (!role) {
            throw new common_1.ConflictException(`Role ${invitation.role} not found`);
        }
        const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
        const category = this.resolveUserCategory(invitation.role);
        const user = await this.prisma.$transaction(async (tx) => {
            const created = await tx.user.create({
                data: {
                    name: dto.name,
                    email: dto.email,
                    passwordHash,
                    roleId: role.id,
                    category,
                    companyId,
                    tenantId,
                    mustChangePassword: false,
                    isActive: true,
                },
                include: { role: true },
            });
            await tx.invitationToken.update({
                where: { id: invitation.id },
                data: { used: true },
            });
            if (invitation.role === 'EXTERNAL_CLIENT_CRM' ||
                invitation.role === 'CLIENT') {
                await tx.companyRepresentative.upsert({
                    where: {
                        companyId_userId: {
                            companyId,
                            userId: created.id,
                        },
                    },
                    update: {},
                    create: {
                        companyId,
                        userId: created.id,
                        isPrimary: false,
                    },
                });
            }
            return created;
        });
        const tokens = await this.generateTokens(user.id, user.email, user.role.name, user.category, user.clientId, user.companyId, user.tenantId);
        await this.storeRefreshToken(user.id, tokens.refreshToken);
        return {
            user: this.toUserResponse(user),
            ...tokens,
        };
    }
    async validateInvitationToken(token) {
        const invitation = await this.prisma.invitationToken.findUnique({
            where: { token },
            include: { company: { select: { id: true, name: true, status: true } } },
        });
        if (!invitation || invitation.used) {
            throw new common_1.UnauthorizedException('Invalid invitation token');
        }
        if (invitation.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Invitation token has expired');
        }
        if (invitation.company.status === 'SUSPENDED') {
            throw new common_1.ForbiddenException('Company is suspended');
        }
        return {
            valid: true,
            role: invitation.role,
            companyId: invitation.companyId,
            companyName: invitation.company.name,
            expiresAt: invitation.expiresAt.toISOString(),
        };
    }
    async createInvitationToken(createdByUserId, dto) {
        const creator = await this.prisma.user.findUnique({
            where: { id: createdByUserId },
            select: { companyId: true, tenantId: true },
        });
        const companyId = creator?.companyId ?? company_constants_1.DEFAULT_COMPANY_ID;
        const tenantId = creator?.tenantId ?? tenant_constants_1.DEFAULT_TENANT_ID;
        const expiresInDays = dto.expiresInDays ?? 7;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);
        const token = this.generateSecureToken();
        const invitation = await this.prisma.invitationToken.create({
            data: {
                token,
                role: dto.role,
                companyId,
                tenantId,
                expiresAt,
                createdById: createdByUserId,
            },
        });
        return {
            id: invitation.id,
            token: invitation.token,
            role: invitation.role,
            companyId: invitation.companyId,
            used: invitation.used,
            expiresAt: invitation.expiresAt.toISOString(),
        };
    }
    resolveUserCategory(roleName) {
        return roleName === 'CLIENT' || roleName === 'EXTERNAL_CLIENT_CRM'
            ? 'CLIENT'
            : 'MEMBER';
    }
    async assertUserIsActive(user) {
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('User account is deactivated');
        }
    }
    async login(dto) {
        const user = await this.prisma.user.findFirst({
            where: { email: dto.email },
            include: {
                role: true,
                company: true,
                client: { select: { hasCrmEnabled: true } },
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (user.company.status === 'SUSPENDED') {
            throw new common_1.UnauthorizedException('Company is suspended');
        }
        const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        await this.assertUserIsActive(user);
        if (user.role.name === 'CLIENT' && !user.clientId) {
            throw new common_1.UnauthorizedException('Conta de cliente sem empresa vinculada. Contate o administrador.');
        }
        const tokens = await this.generateTokens(user.id, user.email, user.role.name, user.category, user.clientId, user.companyId, user.tenantId);
        await this.prisma.authToken.deleteMany({ where: { userId: user.id } });
        await this.storeRefreshToken(user.id, tokens.refreshToken);
        return {
            user: this.toUserResponse(user),
            ...tokens,
        };
    }
    async refresh(refreshToken) {
        const tokenHash = this.hashToken(refreshToken);
        const storedToken = await this.prisma.authToken.findUnique({
            where: { tokenHash },
            include: {
                user: {
                    include: {
                        role: true,
                        company: true,
                        client: { select: { hasCrmEnabled: true } },
                    },
                },
            },
        });
        if (!storedToken || storedToken.expiresAt < new Date()) {
            if (storedToken) {
                await this.prisma.authToken.deleteMany({ where: { id: storedToken.id } });
            }
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        const consumed = await this.prisma.authToken.deleteMany({
            where: { id: storedToken.id },
        });
        if (consumed.count === 0) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        const { user } = storedToken;
        if (user.company.status === 'SUSPENDED') {
            throw new common_1.UnauthorizedException('Company is suspended');
        }
        await this.assertUserIsActive(user);
        const tokens = await this.generateTokens(user.id, user.email, user.role.name, user.category, user.clientId, user.companyId, user.tenantId);
        await this.storeRefreshToken(user.id, tokens.refreshToken);
        return {
            user: this.toUserResponse(user),
            ...tokens,
        };
    }
    async logout(refreshToken) {
        const tokenHash = this.hashToken(refreshToken);
        await this.prisma.authToken.deleteMany({
            where: { tokenHash },
        });
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                role: true,
                client: { select: { hasCrmEnabled: true } },
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return this.toUserResponse(user);
    }
    async changePassword(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const passwordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Senha atual incorreta');
        }
        const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash,
                mustChangePassword: false,
                temporaryPassword: null,
            },
        });
        return { success: true };
    }
    async generateTokens(userId, email, role, category = 'MEMBER', clientId = null, companyId = null, tenantId = null) {
        const payload = {
            sub: userId,
            email,
            role,
            category,
            clientId,
            companyId,
            tenantId,
        };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
                expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
            }),
            this.jwtService.signAsync({ ...payload, jti: (0, crypto_1.randomBytes)(16).toString('hex') }, {
                secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
            }),
        ]);
        return { accessToken, refreshToken };
    }
    async storeRefreshToken(userId, refreshToken) {
        const tokenHash = this.hashToken(refreshToken);
        const expiresAt = this.getRefreshExpirationDate();
        await this.prisma.authToken.create({
            data: {
                userId,
                tokenHash,
                expiresAt,
            },
        });
    }
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    getRefreshExpirationDate() {
        const expiration = this.configService.get('JWT_REFRESH_EXPIRATION', '7d');
        const match = expiration.match(/^(\d+)([dhms])$/);
        if (!match) {
            return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }
        const value = parseInt(match[1], 10);
        const unit = match[2];
        const multipliers = {
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000,
        };
        return new Date(Date.now() + value * multipliers[unit]);
    }
    toUserResponse(user) {
        const category = user.category ??
            this.resolveUserCategory(user.role.name);
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role.name,
            category,
            avatarUrl: user.avatarUrl,
            clientId: user.clientId ?? null,
            companyId: user.companyId ?? null,
            tenantId: user.tenantId ?? null,
            mustChangePassword: user.mustChangePassword ?? false,
            isActive: user.isActive ?? true,
            permissions: (0, permissions_1.resolvePermissions)(user.role.name),
            hasCrmEnabled: user.client?.hasCrmEnabled ?? false,
        };
    }
    generateSecureToken() {
        return (0, crypto_1.randomBytes)(64).toString('hex');
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map