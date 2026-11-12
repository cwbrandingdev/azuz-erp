import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserGroupDto } from '../users/dto/user.dto';

const memberInclude = {
  members: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          category: true,
          role: { select: { name: true } },
        },
      },
    },
    orderBy: { assignedAt: 'asc' as const },
  },
  _count: { select: { users: true, members: true } },
} as const;

@Injectable()
export class UserGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const groups = await this.prisma.userGroup.findMany({
      orderBy: { name: 'asc' },
      include: memberInclude,
    });

    return groups.map((group) => this.toResponse(group));
  }

  async findOne(id: string) {
    const group = await this.ensureExists(id);
    return this.toResponse(group);
  }

  async update(id: string, dto: UpdateUserGroupDto) {
    await this.ensureExists(id);

    try {
      const group = await this.prisma.userGroup.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description: dto.description?.trim(),
          color: dto.color,
        },
        include: memberInclude,
      });
      return this.toResponse(group);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('User group name already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.userGroup.delete({ where: { id } });
  }

  async addMembers(id: string, memberIds: string[]) {
    await this.ensureExists(id);

    const users = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, category: true },
    });

    if (users.length !== memberIds.length) {
      throw new NotFoundException('One or more users were not found');
    }

    if (users.some((user) => user.category === UserCategory.CLIENT)) {
      throw new BadRequestException(
        'CLIENT users cannot be added to member groups',
      );
    }

    await this.prisma.userGroupMember.createMany({
      data: memberIds.map((userId) => ({ userId, userGroupId: id })),
      skipDuplicates: true,
    });

    await this.prisma.user.updateMany({
      where: {
        id: { in: memberIds },
        category: UserCategory.MEMBER,
        userGroupId: null,
      },
      data: { userGroupId: id },
    });

    return this.findOne(id);
  }

  private async ensureExists(id: string) {
    const group = await this.prisma.userGroup.findUnique({
      where: { id },
      include: memberInclude,
    });
    if (!group) throw new NotFoundException('User group not found');
    return group;
  }

  private toResponse(group: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    createdAt: Date;
    updatedAt: Date;
    members?: Array<{
      assignedAt: Date;
      user: {
        id: string;
        name: string;
        email: string;
        avatarUrl: string | null;
        category: UserCategory;
        role: { name: string };
      };
    }>;
    _count?: { users: number; members?: number };
  }) {
    const members = (group.members ?? [])
      .filter((membership) => membership.user.category === UserCategory.MEMBER)
      .map((membership) => ({
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        avatarUrl: membership.user.avatarUrl,
        role: membership.user.role.name.toLowerCase(),
        category: membership.user.category.toLowerCase(),
        assignedAt: membership.assignedAt.toISOString(),
      }));

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      color: group.color,
      userCount:
        members.length || group._count?.members || group._count?.users || 0,
      members,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    );
  }
}
