"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProposalsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
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
    items: { orderBy: { sortOrder: 'asc' } },
    projects: { orderBy: { sortOrder: 'asc' } },
};
let ProposalsService = class ProposalsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
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
    async findOne(id) {
        const proposal = await this.ensureExists(id);
        return this.toResponse(proposal);
    }
    async findPublic(slugOrId) {
        const proposal = await this.findBySlugOrId(slugOrId);
        if (!proposal) {
            throw new common_1.NotFoundException('Proposal not found');
        }
        if (proposal.status === client_1.ProposalStatus.DRAFT) {
            throw new common_1.NotFoundException('Proposal not found');
        }
        if (proposal.status === client_1.ProposalStatus.ARCHIVED) {
            throw new common_1.NotFoundException('Proposal not found');
        }
        const expired = proposal.status === client_1.ProposalStatus.EXPIRED ||
            (proposal.validUntil !== null &&
                proposal.validUntil.getTime() < Date.now());
        if (expired) {
            if (proposal.status !== client_1.ProposalStatus.EXPIRED) {
                await this.prisma.proposal.update({
                    where: { id: proposal.id },
                    data: { status: client_1.ProposalStatus.EXPIRED },
                });
            }
            return {
                ...this.toResponse({
                    ...proposal,
                    status: client_1.ProposalStatus.EXPIRED,
                }),
                expired: true,
            };
        }
        return {
            ...this.toResponse(proposal),
            expired: false,
        };
    }
    async create(userId, dto) {
        if (dto.clientId)
            await this.ensureClientExists(dto.clientId);
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
                status: dto.status ?? client_1.ProposalStatus.DRAFT,
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
                    create: projects.map((project, index) => this.mapProjectCreate(project, index)),
                },
            },
            include: proposalInclude,
        });
        return this.toResponse(proposal);
    }
    async update(id, dto) {
        await this.ensureExists(id);
        if (dto.clientId)
            await this.ensureClientExists(dto.clientId);
        const data = {
            title: dto.title,
            companyName: dto.companyName?.trim(),
            status: dto.status,
            structureContent: dto.structureContent,
            structureImageUrls: dto.structureImageUrls,
            coverVideoUrl: dto.coverVideoUrl,
            coverImageUrl: dto.coverImageUrl,
            schedulingUrl: dto.schedulingUrl,
            validUntil: dto.validUntil === undefined
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
                create: dto.items.map((item, index) => this.mapItemCreate(item, index)),
            };
        }
        else if (dto.totalValue !== undefined) {
            data.totalValue = dto.totalValue;
        }
        if (dto.projects) {
            data.projects = {
                deleteMany: {},
                create: dto.projects.map((project, index) => this.mapProjectCreate(project, index)),
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
    async publish(id) {
        const existing = await this.ensureExists(id);
        if (!existing.items.length) {
            throw new common_1.BadRequestException('Add at least one service item before publishing');
        }
        if (existing.validUntil &&
            existing.validUntil.getTime() < Date.now()) {
            throw new common_1.BadRequestException('Validity date must be in the future to publish');
        }
        await this.prisma.proposal.update({
            where: { id },
            data: {
                status: client_1.ProposalStatus.PUBLISHED,
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
    async remove(id) {
        await this.ensureExists(id);
        await this.prisma.proposal.delete({ where: { id } });
    }
    mapItemCreate(item, index) {
        return {
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            sortOrder: item.sortOrder ?? index,
        };
    }
    mapProjectCreate(project, index) {
        return {
            title: project.title,
            description: project.description,
            imageUrl: project.imageUrl,
            projectUrl: project.projectUrl,
            sortOrder: project.sortOrder ?? index,
        };
    }
    slugify(value) {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    async generateUniqueSlug(companyName, excludeId) {
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
            if (!existing)
                return slug;
            slug = `${base}-${counter}`;
            counter += 1;
        }
    }
    async findBySlugOrId(slugOrId) {
        const bySlug = await this.prisma.proposal.findUnique({
            where: { slug: slugOrId },
            include: proposalInclude,
        });
        if (bySlug)
            return bySlug;
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(slugOrId))
            return null;
        return this.prisma.proposal.findUnique({
            where: { id: slugOrId },
            include: proposalInclude,
        });
    }
    async ensureExists(id) {
        const proposal = await this.prisma.proposal.findUnique({
            where: { id },
            include: proposalInclude,
        });
        if (!proposal) {
            throw new common_1.NotFoundException('Proposal not found');
        }
        return proposal;
    }
    async ensureClientExists(clientId) {
        const client = await this.prisma.client.findUnique({
            where: { id: clientId },
            select: { id: true },
        });
        if (!client) {
            throw new common_1.BadRequestException('Client not found');
        }
    }
    toResponse(proposal) {
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
};
exports.ProposalsService = ProposalsService;
exports.ProposalsService = ProposalsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProposalsService);
//# sourceMappingURL=proposals.service.js.map