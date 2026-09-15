import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProposalStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProposalDto,
  ProposalItemDto,
  ProposalProjectDto,
  QueryProposalsDto,
  UpdateProposalDto,
} from './dto/proposal.dto';

const proposalInclude = {
  client: {
    select: {
      id: true,
      companyName: true,
      contactName: true,
      email: true,
      phone: true,
      avatarUrl: true,
    },
  },
  createdBy: {
    select: { id: true, name: true, email: true, avatarUrl: true },
  },
  items: { orderBy: { sortOrder: 'asc' as const } },
  projects: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.ProposalInclude;

type ProposalWithRelations = Prisma.ProposalGetPayload<{
  include: typeof proposalInclude;
}>;

@Injectable()
export class ProposalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProposalsDto) {
    const proposals = await this.prisma.proposal.findMany({
      where: {
        clientId: query.clientId,
        status: query.status,
      },
      include: proposalInclude,
      orderBy: { createdAt: 'desc' },
    });

    return proposals.map((proposal) => this.toResponse(proposal));
  }

  async findOne(id: string) {
    const proposal = await this.ensureExists(id);
    return this.toResponse(proposal);
  }

  async findPublic(slugOrId: string) {
    const proposal = await this.findBySlugOrId(slugOrId);

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.status === ProposalStatus.DRAFT) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.status === ProposalStatus.ARCHIVED) {
      throw new NotFoundException('Proposal not found');
    }

    const expired =
      proposal.status === ProposalStatus.EXPIRED ||
      (proposal.validUntil !== null &&
        proposal.validUntil.getTime() < Date.now());

    if (expired) {
      if (proposal.status !== ProposalStatus.EXPIRED) {
        await this.prisma.proposal.update({
          where: { id: proposal.id },
          data: { status: ProposalStatus.EXPIRED },
        });
      }

      return {
        ...this.toResponse({
          ...proposal,
          status: ProposalStatus.EXPIRED,
        }),
        expired: true,
      };
    }

    return {
      ...this.toResponse(proposal),
      expired: false,
    };
  }

  async create(userId: string, dto: CreateProposalDto) {
    if (dto.clientId) await this.ensureClientExists(dto.clientId);

    const items = dto.items ?? [];
    const projects = dto.projects ?? [];
    const totalValue = dto.totalValue ?? 0;
    const slug = await this.generateUniqueSlug(dto.companyName);

    const proposal = await this.prisma.proposal.create({
      data: {
        clientId: dto.clientId ?? null,
        companyName: dto.companyName.trim(),
        slug,
        title: dto.title,
        status: dto.status ?? ProposalStatus.DRAFT,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        totalValue,
        structureContent: dto.structureContent,
        structureImageUrls: dto.structureImageUrls ?? [],
        coverVideoUrl: dto.coverVideoUrl,
        coverImageUrl: dto.coverImageUrl,
        schedulingUrl: dto.schedulingUrl,
        createdById: userId,
        items: {
          create: items.map((item, index) => this.mapItemCreate(item, index)),
        },
        projects: {
          create: projects.map((project, index) =>
            this.mapProjectCreate(project, index),
          ),
        },
      },
      include: proposalInclude,
    });

    return this.toResponse(proposal);
  }

  async update(id: string, dto: UpdateProposalDto) {
    await this.ensureExists(id);

    if (dto.clientId) await this.ensureClientExists(dto.clientId);

    const data: Prisma.ProposalUpdateInput = {
      title: dto.title,
      companyName: dto.companyName?.trim(),
      status: dto.status,
      structureContent: dto.structureContent,
      structureImageUrls: dto.structureImageUrls,
      coverVideoUrl: dto.coverVideoUrl,
      coverImageUrl: dto.coverImageUrl,
      schedulingUrl: dto.schedulingUrl,
      validUntil:
        dto.validUntil === undefined
          ? undefined
          : dto.validUntil
            ? new Date(dto.validUntil)
            : null,
      client: dto.clientId
        ? { connect: { id: dto.clientId } }
        : undefined,
    };

    if (dto.items) {
      if (dto.totalValue !== undefined) {
        data.totalValue = dto.totalValue;
      }
      data.items = {
        deleteMany: {},
        create: dto.items.map((item, index) =>
          this.mapItemCreate(item, index),
        ),
      };
    } else if (dto.totalValue !== undefined) {
      data.totalValue = dto.totalValue;
    }

    if (dto.projects) {
      data.projects = {
        deleteMany: {},
        create: dto.projects.map((project, index) =>
          this.mapProjectCreate(project, index),
        ),
      };
    }

    if (dto.companyName) {
      data.slug = await this.generateUniqueSlug(dto.companyName, id);
    }

    const proposal = await this.prisma.proposal.update({
      where: { id },
      data,
      include: proposalInclude,
    });

    return this.toResponse(proposal);
  }

  async publish(id: string) {
    const existing = await this.ensureExists(id);

    if (!existing.items.length) {
      throw new BadRequestException(
        'Add at least one service item before publishing',
      );
    }

    if (
      existing.validUntil &&
      existing.validUntil.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'Validity date must be in the future to publish',
      );
    }

    await this.prisma.proposal.update({
      where: { id },
      data: {
        status: ProposalStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    const proposal = await this.ensureExists(id);

    const response = this.toResponse(proposal);
    return {
      ...response,
      publicPath: `/p/${proposal.slug}`,
    };
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.proposal.delete({ where: { id } });
  }

  private mapItemCreate(item: ProposalItemDto, index: number) {
    return {
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      sortOrder: item.sortOrder ?? index,
    };
  }

  private mapProjectCreate(project: ProposalProjectDto, index: number) {
    return {
      title: project.title,
      description: project.description,
      imageUrl: project.imageUrl,
      projectUrl: project.projectUrl,
      sortOrder: project.sortOrder ?? index,
    };
  }

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async generateUniqueSlug(companyName: string, excludeId?: string) {
    const base = this.slugify(companyName) || 'proposta';
    let slug = base;
    let counter = 2;

    while (true) {
      const existing = await this.prisma.proposal.findFirst({
        where: {
          slug,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        select: { id: true },
      });

      if (!existing) return slug;

      slug = `${base}-${counter}`;
      counter += 1;
    }
  }

  private async findBySlugOrId(slugOrId: string) {
    const bySlug = await this.prisma.proposal.findUnique({
      where: { slug: slugOrId },
      include: proposalInclude,
    });

    if (bySlug) return bySlug;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(slugOrId)) return null;

    return this.prisma.proposal.findUnique({
      where: { id: slugOrId },
      include: proposalInclude,
    });
  }

  private async ensureExists(id: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: proposalInclude,
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    return proposal;
  }

  private async ensureClientExists(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }
  }

  private toResponse(proposal: ProposalWithRelations) {
    return {
      id: proposal.id,
      clientId: proposal.clientId ?? null,
      client: proposal.client ?? null,
      companyName: proposal.companyName,
      slug: proposal.slug,
      title: proposal.title,
      status: proposal.status.toLowerCase(),
      validUntil: proposal.validUntil?.toISOString() ?? null,
      totalValue: Number(proposal.totalValue),
      structureContent: proposal.structureContent,
      structureImageUrls: proposal.structureImageUrls,
      coverVideoUrl: proposal.coverVideoUrl,
      coverImageUrl: proposal.coverImageUrl,
      schedulingUrl: proposal.schedulingUrl,
      publishedAt: proposal.publishedAt?.toISOString() ?? null,
      createdBy: proposal.createdBy,
      items: proposal.items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        sortOrder: item.sortOrder,
        subtotal: Number(item.unitPrice) * item.quantity,
      })),
      projects: proposal.projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        imageUrl: project.imageUrl,
        projectUrl: project.projectUrl,
        sortOrder: project.sortOrder,
      })),
      createdAt: proposal.createdAt.toISOString(),
      updatedAt: proposal.updatedAt.toISOString(),
    };
  }
}
