import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateClientGroupDto } from './dto/client-group.dto';

@Injectable()
export class ClientGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const groups = await this.prisma.clientGroup.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { clients: true } } },
    });

    return groups.map((group) => this.toResponse(group));
  }

  async findOne(id: string) {
    const group = await this.ensureExists(id);
    return this.toResponse(group);
  }

  async update(id: string, dto: UpdateClientGroupDto) {
    await this.ensureExists(id);

    try {
      const group = await this.prisma.clientGroup.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description: dto.description?.trim(),
          color: dto.color,
        },
        include: { _count: { select: { clients: true } } },
      });
      return this.toResponse(group);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Client group name already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.clientGroup.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const group = await this.prisma.clientGroup.findUnique({
      where: { id },
      include: { _count: { select: { clients: true } } },
    });
    if (!group) throw new NotFoundException('Client group not found');
    return group;
  }

  private toResponse(group: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    createdAt: Date;
    updatedAt: Date;
    _count?: { clients: number };
  }) {
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      color: group.color,
      clientCount: group._count?.clients ?? 0,
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
