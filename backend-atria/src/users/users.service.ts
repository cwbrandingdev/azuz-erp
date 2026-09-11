import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, RoleName, UserCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { FinanceService } from '../finance/finance.service';
import { CrmScopeService } from '../leads/crm-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../supabase/supabase-storage.service';
import { DEFAULT_COMPANY_ID } from '../company/company.constants';
import { ProvisionUserDto, UpdateUserDto } from './dto/user.dto';

const LOCAL_AVATAR_DIR = join(process.cwd(), 'uploads', 'avatars');

const SALT_ROUNDS = 12;

const userGroupSelect = {
  id: true,
  name: true,
  description: true,
  color: true,
} as const;

function isCrmRole(role: RoleName): boolean {
  return role === RoleName.CRM;
}

function isClientRole(role: RoleName): boolean {
  return role === RoleName.CLIENT || role === RoleName.EXTERNAL_CLIENT_CRM;
}

function slugifyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
    .join('.');
}

function generateTemporaryPassword(): string {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = randomBytes(12);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly financeService: FinanceService,
    private readonly storage: SupabaseStorageService,
    private readonly crmScope: CrmScopeService,
  ) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { name: 'asc' },
      include: {
        role: true,
        userGroup: true,
        userGroups: { include: { userGroup: true } },
        client: { select: { id: true, companyName: true } },
        crmScopes: { select: { clientId: true, includeInternal: true } },
        sdrAssignments: { select: { organizationId: true } },
      },
    });

    return users.map((user) =>
      this.toUserResponse(
        user,
        this.snapshotFromRelations(
          user.crmScopes,
          user.sdrAssignments.map((assignment) => assignment.organizationId),
        ),
      ),
    );
  }

  async findMembers() {
    const users = await this.prisma.user.findMany({
      where: { category: UserCategory.MEMBER },
      orderBy: { name: 'asc' },
      include: {
        role: true,
        userGroup: true,
        userGroups: { include: { userGroup: true } },
        client: { select: { id: true, companyName: true } },
        crmScopes: { select: { clientId: true, includeInternal: true } },
        sdrAssignments: { select: { organizationId: true } },
        _count: {
          select: {
            kanbanAssignments: {
              where: { task: { deletedAt: null } },
            },
          },
        },
      },
    });

    return users.map((user) => ({
      ...this.toUserResponse(
        user,
        this.snapshotFromRelations(
          user.crmScopes,
          user.sdrAssignments.map((assignment) => assignment.organizationId),
        ),
      ),
      activeTaskCount: user._count.kanbanAssignments,
    }));
  }

  async findClients() {
    const users = await this.prisma.user.findMany({
      where: { category: UserCategory.CLIENT },
      orderBy: { name: 'asc' },
      include: {
        role: true,
        userGroup: true,
        userGroups: { include: { userGroup: true } },
        client: {
          select: {
            id: true,
            companyName: true,
            _count: {
              select: {
                deliverables: {
                  where: {
                    approvalStatus: {
                      in: ['DRAFT', 'PENDING_APPROVAL', 'REQUIRES_ADJUSTMENT'],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return users.map((user) => {
      const base = this.toUserResponse(user);
      const portalAccess = !user.clientId
        ? 'unlinked'
        : user.mustChangePassword
          ? 'pending'
          : 'active';

      return {
        ...base,
        portalAccess,
        activeDeliverableCount: user.client?._count.deliverables ?? 0,
      };
    });
  }

  async provision(dto: ProvisionUserDto, createdByUserId: string) {
    const role = await this.prisma.role.findUnique({
      where: { name: dto.role },
    });

    if (!role) {
      throw new BadRequestException(`Role ${dto.role} not found`);
    }

    if (isClientRole(dto.role) && !dto.clientId) {
      throw new BadRequestException(
        'clientId is required when provisioning a client-facing user',
      );
    }

    if (isCrmRole(dto.role)) {
      this.assertCrmScopeInput(
        dto.crmScopeClientIds ?? [],
        dto.crmIncludeInternal ?? false,
      );
    }

    let clientId: string | null = null;
    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: dto.clientId },
        select: { id: true },
      });
      if (!client) {
        throw new NotFoundException('Client not found');
      }
      clientId = client.id;
    }

    const category = isClientRole(dto.role)
      ? UserCategory.CLIENT
      : UserCategory.MEMBER;

    const groupIds =
      category === UserCategory.CLIENT
        ? []
        : dto.userGroupIds?.length
          ? dto.userGroupIds
          : dto.userGroupId
            ? [dto.userGroupId]
            : [];

    for (const groupId of groupIds) {
      const group = await this.prisma.userGroup.findUnique({
        where: { id: groupId },
      });
      if (!group) {
        throw new NotFoundException('User group not found');
      }
    }

    const domain =
      dto.emailDomain?.trim().toLowerCase() ||
      this.configService.get<string>('COMPANY_EMAIL_DOMAIN', 'atria.com');

    const email = dto.email?.trim().toLowerCase()
      ? dto.email.trim().toLowerCase()
      : await this.generateUniqueEmail(dto.name, domain);

    if (dto.email?.trim()) {
      const existing = await this.prisma.user.findFirst({
        where: { email },
      });
      if (existing) {
        throw new BadRequestException('Email already registered');
      }
    }

    const temporaryPassword = dto.password?.trim() || generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);
    const monthlySalary =
      !isClientRole(dto.role) && dto.monthlySalary !== undefined
        ? new Prisma.Decimal(dto.monthlySalary)
        : null;

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash,
        temporaryPassword,
        roleId: role.id,
        category,
        clientId,
        avatarUrl: dto.avatarUrl?.trim() || null,
        userGroupId: groupIds[0] ?? null,
        monthlySalary,
        mustChangePassword: true,
        userGroups: groupIds.length
          ? {
              create: groupIds.map((userGroupId) => ({ userGroupId })),
            }
          : undefined,
      },
      include: {
        role: true,
        userGroup: true,
        userGroups: { include: { userGroup: true } },
        client: { select: { id: true, companyName: true } },
      },
    });

    if (monthlySalary && Number(monthlySalary) > 0) {
      await this.financeService.generateSalaryExpensesForEmployee({
        createdByUserId,
        employeeName: user.name,
        monthlySalary: Number(monthlySalary),
      });
    }

    if (isClientRole(dto.role)) {
      await this.ensureCompanyRepresentative(user.id, user.companyId);
    }

    if (isCrmRole(dto.role)) {
      await this.crmScope.replaceUserScopes(
        user.id,
        dto.crmScopeClientIds ?? [],
        dto.crmIncludeInternal ?? false,
      );
    }

    const snapshot = await this.crmScope.getScopeSnapshot(user.id);

    return {
      user: this.toUserResponse(user, snapshot),
      credentials: {
        email,
        temporaryPassword,
      },
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        userGroup: true,
        userGroups: { include: { userGroup: true } },
        client: { select: { id: true, companyName: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    let roleId = existing.roleId;
    let nextRoleName = existing.role.name;
    if (dto.role) {
      const role = await this.prisma.role.findUnique({
        where: { name: dto.role },
      });
      if (!role) {
        throw new BadRequestException(`Role ${dto.role} not found`);
      }
      roleId = role.id;
      nextRoleName = role.name;
    }

    if (isCrmRole(nextRoleName)) {
      const snapshot = await this.crmScope.getScopeSnapshot(id);
      const scopeClientIds = dto.crmScopeClientIds ?? snapshot.clientIds;
      const includeInternal =
        dto.crmIncludeInternal ?? snapshot.includeInternal;
      this.assertCrmScopeInput(scopeClientIds, includeInternal);
    }

    const nextCategory = isClientRole(nextRoleName)
      ? UserCategory.CLIENT
      : UserCategory.MEMBER;

    const groupIds =
      nextCategory === UserCategory.CLIENT
        ? []
        : dto.userGroupIds ??
          (dto.userGroupId !== undefined
            ? dto.userGroupId
              ? [dto.userGroupId]
              : []
            : undefined);

    if (groupIds) {
      for (const groupId of groupIds) {
        const group = await this.prisma.userGroup.findUnique({
          where: { id: groupId },
        });
        if (!group) {
          throw new NotFoundException('User group not found');
        }
      }
    }

    let clientId =
      dto.clientId !== undefined ? dto.clientId : existing.clientId;
    if (nextCategory === UserCategory.CLIENT && !clientId) {
      throw new BadRequestException(
        'clientId is required when category is CLIENT',
      );
    }
    if (nextCategory === UserCategory.MEMBER && dto.role) {
      clientId = null;
    }
    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: dto.clientId },
        select: { id: true },
      });
      if (!client) {
        throw new NotFoundException('Client not found');
      }
    }

    if (dto.avatarUrl === null) {
      await this.deleteStoredAvatar(existing.avatarUrl);
    }

    const nextEmail = dto.email?.trim().toLowerCase();
    if (nextEmail && nextEmail !== existing.email.toLowerCase()) {
      const taken = await this.prisma.user.findFirst({
        where: { email: nextEmail, NOT: { id } },
      });
      if (taken) {
        throw new BadRequestException('Email already registered');
      }
    }

    const user = await this.prisma.$transaction(async (tx) => {
      if (groupIds) {
        await tx.userGroupMember.deleteMany({ where: { userId: id } });
        if (groupIds.length) {
          await tx.userGroupMember.createMany({
            data: groupIds.map((userGroupId) => ({ userId: id, userGroupId })),
          });
        }
      }

      return tx.user.update({
        where: { id },
        data: {
          email: nextEmail && nextEmail !== existing.email.toLowerCase()
            ? nextEmail
            : undefined,
          userGroupId:
            nextCategory === UserCategory.CLIENT
              ? null
              : groupIds !== undefined
                ? groupIds[0] ?? null
                : dto.userGroupId === null
                  ? null
                  : dto.userGroupId !== undefined
                    ? dto.userGroupId
                    : undefined,
          roleId,
          category: nextCategory,
          clientId,
          avatarUrl:
            dto.avatarUrl === null
              ? null
              : dto.avatarUrl !== undefined
                ? dto.avatarUrl.trim() || null
                : undefined,
          monthlySalary:
            nextCategory === UserCategory.CLIENT
              ? null
              : dto.monthlySalary === null
                ? null
                : dto.monthlySalary !== undefined
                  ? new Prisma.Decimal(dto.monthlySalary)
                  : undefined,
        },
        include: {
          role: true,
          userGroup: true,
          userGroups: { include: { userGroup: true } },
          client: { select: { id: true, companyName: true } },
        },
      });
    });

    if (isCrmRole(nextRoleName)) {
      if (
        dto.crmScopeClientIds !== undefined ||
        dto.crmIncludeInternal !== undefined ||
        dto.role === RoleName.CRM
      ) {
        const snapshot = await this.crmScope.getScopeSnapshot(user.id);
        const scopeClientIds = dto.crmScopeClientIds ?? snapshot.clientIds;
        const includeInternal =
          dto.crmIncludeInternal ?? snapshot.includeInternal;
        await this.crmScope.replaceUserScopes(
          user.id,
          scopeClientIds,
          includeInternal,
        );
      }
    } else {
      await this.crmScope.clearUserScopes(user.id);
    }

    return this.toUserResponse(
      user,
      await this.crmScope.getScopeSnapshot(user.id),
    );
  }

  async uploadAvatar(id: string, file: Express.Multer.File) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, companyId: true, avatarUrl: true },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (!file.buffer?.length) {
      throw new BadRequestException('Arquivo obrigatório');
    }

    const companyId = existing.companyId ?? DEFAULT_COMPANY_ID;
    const extension = this.resolveImageExtension(file);
    const objectPath = `${companyId}/${id}/${randomUUID()}${extension}`;
    const avatarUrl = await this.persistAvatarFile(objectPath, file);

    await this.deleteStoredAvatar(existing.avatarUrl);

    return this.updateAvatar(id, avatarUrl);
  }

  async removeAvatar(id: string) {
    return this.updateAvatar(id, null);
  }

  async deactivate(id: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        userGroup: true,
        userGroups: { include: { userGroup: true } },
        client: { select: { id: true, companyName: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (!existing.isActive) {
      return this.toUserResponse(existing);
    }

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.authToken.deleteMany({ where: { userId: id } });

      return tx.user.update({
        where: { id },
        data: { isActive: false },
        include: {
          role: true,
          userGroup: true,
          userGroups: { include: { userGroup: true } },
          client: { select: { id: true, companyName: true } },
        },
      });
    });

    return this.toUserResponse(user);
  }

  async findRepresentatives() {
    const representatives = await this.prisma.companyRepresentative.findMany({
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      include: {
        user: {
          include: {
            role: true,
            userGroup: true,
            userGroups: { include: { userGroup: true } },
            client: { select: { id: true, companyName: true } },
          },
        },
      },
    });

    return representatives.map((entry) => ({
      id: entry.id,
      title: entry.title,
      isPrimary: entry.isPrimary,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      user: this.toUserResponse(entry.user),
    }));
  }

  private async ensureCompanyRepresentative(userId: string, companyId: string) {
    await this.prisma.companyRepresentative.upsert({
      where: {
        companyId_userId: {
          companyId,
          userId,
        },
      },
      update: {},
      create: {
        companyId,
        userId,
        isPrimary: false,
      },
    });
  }

  async updateAvatar(id: string, avatarUrl: string | null) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (avatarUrl === null) {
      const current = await this.prisma.user.findUnique({
        where: { id },
        select: { avatarUrl: true },
      });
      await this.deleteStoredAvatar(current?.avatarUrl ?? null);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { avatarUrl },
      include: {
        role: true,
        userGroup: true,
        userGroups: { include: { userGroup: true } },
        client: { select: { id: true, companyName: true } },
      },
    });

    return this.toUserResponse(user);
  }

  private async persistAvatarFile(
    objectPath: string,
    file: Express.Multer.File,
  ): Promise<string> {
    if (this.storage.isConfigured) {
      return this.storage.uploadPublicObject({
        bucket: this.storage.getAvatarBucket(),
        path: objectPath,
        body: file.buffer,
        contentType: file.mimetype,
        upsert: true,
      });
    }

    if (!existsSync(LOCAL_AVATAR_DIR)) {
      mkdirSync(LOCAL_AVATAR_DIR, { recursive: true });
    }

    const filename = objectPath.replace(/\//g, '_');
    writeFileSync(join(LOCAL_AVATAR_DIR, filename), file.buffer);
    return `/uploads/avatars/${filename}`;
  }

  private async deleteStoredAvatar(avatarUrl: string | null) {
    if (!avatarUrl) return;

    if (this.storage.isConfigured) {
      const bucket = this.storage.getAvatarBucket();
      const objectPath = this.storage.extractObjectPathFromPublicUrl(
        avatarUrl,
        bucket,
      );
      if (objectPath) {
        try {
          await this.storage.removeObject(bucket, objectPath);
        } catch {
          return;
        }
      }
    }
  }

  private resolveImageExtension(file: Express.Multer.File): string {
    const fromName = extname(file.originalname || '').toLowerCase();
    if (fromName && ['.png', '.jpg', '.jpeg', '.webp'].includes(fromName)) {
      return fromName === '.jpeg' ? '.jpg' : fromName;
    }

    switch (file.mimetype) {
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      default:
        return '.jpg';
    }
  }

  private assertCrmScopeInput(
    crmScopeClientIds: string[],
    crmIncludeInternal: boolean,
  ) {
    if (!crmIncludeInternal && crmScopeClientIds.length === 0) {
      throw new BadRequestException(
        'Usuários CRM precisam de escopo interno ou clientes vinculados.',
      );
    }
  }

  private snapshotFromRelations(
    scopes?: Array<{ clientId: string | null; includeInternal: boolean }>,
    assignmentOrganizationIds?: string[],
  ) {
    const clientIds = [
      ...(scopes
        ?.map((scope) => scope.clientId)
        .filter((id): id is string => Boolean(id)) ?? []),
      ...(assignmentOrganizationIds ?? []),
    ];

    return {
      includeInternal: scopes?.some((scope) => scope.includeInternal) ?? false,
      clientIds: [...new Set(clientIds)],
    };
  }

  private async generateUniqueEmail(name: string, domain: string): Promise<string> {
    const base = slugifyName(name);
    if (!base) {
      throw new BadRequestException('Unable to generate email from name');
    }

    let candidate = `${base}@${domain}`;
    let suffix = 1;

    while (await this.prisma.user.findFirst({ where: { email: candidate } })) {
      candidate = `${base}${suffix}@${domain}`;
      suffix += 1;
    }

    return candidate;
  }

  private toUserResponse(
    user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    category?: UserCategory;
    clientId?: string | null;
    monthlySalary: Prisma.Decimal | null;
    mustChangePassword: boolean;
    temporaryPassword: string | null;
    isActive?: boolean;
    createdAt: Date;
    role?: { name: RoleName; permissions: string[] } | null;
    userGroup: {
      id: string;
      name: string;
      description: string | null;
      color: string;
    } | null;
    userGroups?: Array<{
      userGroup: {
        id: string;
        name: string;
        description: string | null;
        color: string;
      };
    }>;
    client?: { id: string; companyName: string } | null;
  },
    crmScope?: { includeInternal: boolean; clientIds: string[] },
  ) {
    const category =
      user.category ??
      (user.role?.name && isClientRole(user.role.name)
        ? UserCategory.CLIENT
        : UserCategory.MEMBER);

    const groups =
      category === UserCategory.CLIENT
        ? []
        : user.userGroups?.map((membership) => membership.userGroup) ??
          (user.userGroup ? [user.userGroup] : []);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: (user.role?.name ?? RoleName.DESIGNER_JUNIOR).toLowerCase(),
      category: category.toLowerCase(),
      permissions: user.role?.permissions ?? [],
      avatarUrl: user.avatarUrl,
      clientId: user.clientId ?? null,
      client: user.client
        ? { id: user.client.id, companyName: user.client.companyName }
        : null,
      monthlySalary: user.monthlySalary ? Number(user.monthlySalary) : null,
      mustChangePassword: user.mustChangePassword,
      hasChangedPassword: !user.mustChangePassword,
      isActive: user.isActive ?? true,
      isFirstLogin: user.mustChangePassword,
      temporaryPassword: user.mustChangePassword
        ? user.temporaryPassword
        : null,
      userGroup: groups[0]
        ? {
            id: groups[0].id,
            name: groups[0].name,
            description: groups[0].description,
            color: groups[0].color,
          }
        : null,
      userGroups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        color: group.color,
      })),
      ...(crmScope
        ? {
            crmIncludeInternal: crmScope.includeInternal,
            crmScopeClientIds: crmScope.clientIds,
          }
        : {
            crmIncludeInternal: false,
            crmScopeClientIds: [],
          }),
      createdAt: user.createdAt.toISOString(),
    };
  }
}
