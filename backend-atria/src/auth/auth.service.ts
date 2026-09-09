import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { DEFAULT_COMPANY_ID } from '../company/company.constants';
import { DEFAULT_TENANT_ID } from '../tenancy/domain/tenant.constants';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateInvitationTokenDto } from './dto/create-invitation-token.dto';
import { SignupWithTokenDto } from './dto/signup-with-token.dto';
import { resolvePermissions } from './constants/permissions';
import { JwtPayload } from './strategies/jwt.strategy';

const SALT_ROUNDS = 12;

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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(_dto: RegisterDto) {
    throw new GoneException(
      'Open registration is disabled. Use POST /auth/signup-with-token with a valid invitation token.',
    );
  }

  async signupWithToken(dto: SignupWithTokenDto) {
    const invitation = await this.prisma.invitationToken.findUnique({
      where: { token: dto.token },
      include: { company: { select: { id: true, status: true, tenantId: true } } },
    });

    if (!invitation || invitation.used) {
      throw new UnauthorizedException('Invalid invitation token');
    }

    if (invitation.expiresAt < new Date()) {
      throw new UnauthorizedException('Invitation token has expired');
    }

    if (invitation.company.status === 'SUSPENDED') {
      throw new ForbiddenException('Company is suspended');
    }

    const companyId = invitation.companyId;
    const tenantId = invitation.tenantId ?? invitation.company.tenantId;

    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const role = await this.prisma.role.findUnique({
      where: { name: invitation.role },
    });

    if (!role) {
      throw new ConflictException(`Role ${invitation.role} not found`);
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

      if (
        invitation.role === 'EXTERNAL_CLIENT_CRM' ||
        invitation.role === 'CLIENT'
      ) {
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

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role.name,
      user.category,
      user.clientId,
      user.companyId,
      user.tenantId,
    );
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.toUserResponse(user),
      ...tokens,
    };
  }

  async validateInvitationToken(token: string) {
    const invitation = await this.prisma.invitationToken.findUnique({
      where: { token },
      include: { company: { select: { id: true, name: true, status: true } } },
    });

    if (!invitation || invitation.used) {
      throw new UnauthorizedException('Invalid invitation token');
    }

    if (invitation.expiresAt < new Date()) {
      throw new UnauthorizedException('Invitation token has expired');
    }

    if (invitation.company.status === 'SUSPENDED') {
      throw new ForbiddenException('Company is suspended');
    }

    return {
      valid: true,
      role: invitation.role,
      companyId: invitation.companyId,
      companyName: invitation.company.name,
      expiresAt: invitation.expiresAt.toISOString(),
    };
  }

  async createInvitationToken(
    createdByUserId: string,
    dto: CreateInvitationTokenDto,
  ) {
    const creator = await this.prisma.user.findUnique({
      where: { id: createdByUserId },
      select: { companyId: true, tenantId: true },
    });
    const companyId = creator?.companyId ?? DEFAULT_COMPANY_ID;
    const tenantId = creator?.tenantId ?? DEFAULT_TENANT_ID;

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

  private resolveUserCategory(
    roleName: string,
  ): 'MEMBER' | 'CLIENT' {
    return roleName === 'CLIENT' || roleName === 'EXTERNAL_CLIENT_CRM'
      ? 'CLIENT'
      : 'MEMBER';
  }

  private async assertUserIsActive(user: { isActive: boolean }) {
    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
      include: {
        role: true,
        company: true,
        client: { select: { hasCrmEnabled: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.company.status === 'SUSPENDED') {
      throw new UnauthorizedException('Company is suspended');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.assertUserIsActive(user);

    if (user.role.name === 'CLIENT' && !user.clientId) {
      throw new UnauthorizedException(
        'Conta de cliente sem empresa vinculada. Contate o administrador.',
      );
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role.name,
      user.category,
      user.clientId,
      user.companyId,
      user.tenantId,
    );
    await this.prisma.authToken.deleteMany({ where: { userId: user.id } });
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.toUserResponse(user),
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
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
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const consumed = await this.prisma.authToken.deleteMany({
      where: { id: storedToken.id },
    });

    if (consumed.count === 0) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const { user } = storedToken;

    if (user.company.status === 'SUSPENDED') {
      throw new UnauthorizedException('Company is suspended');
    }

    await this.assertUserIsActive(user);

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role.name,
      user.category,
      user.clientId,
      user.companyId,
      user.tenantId,
    );
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.toUserResponse(user),
      ...tokens,
    };
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.authToken.deleteMany({
      where: { tokenHash },
    });
  }

  async getProfile(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        client: { select: { hasCrmEnabled: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.toUserResponse(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const passwordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Senha atual incorreta');
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

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    category: 'MEMBER' | 'CLIENT' = 'MEMBER',
    clientId: string | null = null,
    companyId: string | null = null,
    tenantId: string | null = null,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
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
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
      }),
      this.jwtService.signAsync(
        { ...payload, jti: randomBytes(16).toString('hex') },
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
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

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRefreshExpirationDate(): Date {
    const expiration = this.configService.get('JWT_REFRESH_EXPIRATION', '7d');
    const match = expiration.match(/^(\d+)([dhms])$/);

    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * multipliers[unit]);
  }

  private toUserResponse(user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    category?: 'MEMBER' | 'CLIENT';
    clientId?: string | null;
    companyId?: string | null;
    tenantId?: string | null;
    mustChangePassword?: boolean;
    isActive?: boolean;
    role: { name: string };
    client?: { hasCrmEnabled: boolean } | null;
  }): UserResponse {
    const category =
      user.category ??
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
      permissions: resolvePermissions(user.role.name),
      hasCrmEnabled: user.client?.hasCrmEnabled ?? false,
    };
  }

  generateSecureToken(): string {
    return randomBytes(64).toString('hex');
  }
}
