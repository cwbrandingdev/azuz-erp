import { PrismaService } from '../prisma/prisma.service';
import { CreateProposalDto, QueryProposalsDto, UpdateProposalDto } from './dto/proposal.dto';
export declare class ProposalsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(query: QueryProposalsDto): Promise<{
        id: string;
        clientId: string | null;
        client: {
            id: string;
            email: string | null;
            avatarUrl: string | null;
            companyName: string;
            contactName: string | null;
            phone: string | null;
        } | null;
        companyName: string;
        slug: string;
        title: string;
        status: string;
        validUntil: string | null;
        totalValue: number;
        structureContent: string | null;
        structureImageUrls: string[];
        coverVideoUrl: string | null;
        coverImageUrl: string | null;
        schedulingUrl: string | null;
        publishedAt: string | null;
        createdBy: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
        };
        items: {
            id: string;
            name: string;
            description: string | null;
            quantity: number;
            unitPrice: number;
            sortOrder: number;
            subtotal: number;
        }[];
        projects: {
            id: string;
            title: string;
            description: string | null;
            imageUrl: string | null;
            projectUrl: string | null;
            sortOrder: number;
        }[];
        createdAt: string;
        updatedAt: string;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        clientId: string | null;
        client: {
            id: string;
            email: string | null;
            avatarUrl: string | null;
            companyName: string;
            contactName: string | null;
            phone: string | null;
        } | null;
        companyName: string;
        slug: string;
        title: string;
        status: string;
        validUntil: string | null;
        totalValue: number;
        structureContent: string | null;
        structureImageUrls: string[];
        coverVideoUrl: string | null;
        coverImageUrl: string | null;
        schedulingUrl: string | null;
        publishedAt: string | null;
        createdBy: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
        };
        items: {
            id: string;
            name: string;
            description: string | null;
            quantity: number;
            unitPrice: number;
            sortOrder: number;
            subtotal: number;
        }[];
        projects: {
            id: string;
            title: string;
            description: string | null;
            imageUrl: string | null;
            projectUrl: string | null;
            sortOrder: number;
        }[];
        createdAt: string;
        updatedAt: string;
    }>;
    findPublic(slugOrId: string): Promise<{
        expired: boolean;
        id: string;
        clientId: string | null;
        client: {
            id: string;
            email: string | null;
            avatarUrl: string | null;
            companyName: string;
            contactName: string | null;
            phone: string | null;
        } | null;
        companyName: string;
        slug: string;
        title: string;
        status: string;
        validUntil: string | null;
        totalValue: number;
        structureContent: string | null;
        structureImageUrls: string[];
        coverVideoUrl: string | null;
        coverImageUrl: string | null;
        schedulingUrl: string | null;
        publishedAt: string | null;
        createdBy: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
        };
        items: {
            id: string;
            name: string;
            description: string | null;
            quantity: number;
            unitPrice: number;
            sortOrder: number;
            subtotal: number;
        }[];
        projects: {
            id: string;
            title: string;
            description: string | null;
            imageUrl: string | null;
            projectUrl: string | null;
            sortOrder: number;
        }[];
        createdAt: string;
        updatedAt: string;
    }>;
    create(userId: string, dto: CreateProposalDto): Promise<{
        id: string;
        clientId: string | null;
        client: {
            id: string;
            email: string | null;
            avatarUrl: string | null;
            companyName: string;
            contactName: string | null;
            phone: string | null;
        } | null;
        companyName: string;
        slug: string;
        title: string;
        status: string;
        validUntil: string | null;
        totalValue: number;
        structureContent: string | null;
        structureImageUrls: string[];
        coverVideoUrl: string | null;
        coverImageUrl: string | null;
        schedulingUrl: string | null;
        publishedAt: string | null;
        createdBy: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
        };
        items: {
            id: string;
            name: string;
            description: string | null;
            quantity: number;
            unitPrice: number;
            sortOrder: number;
            subtotal: number;
        }[];
        projects: {
            id: string;
            title: string;
            description: string | null;
            imageUrl: string | null;
            projectUrl: string | null;
            sortOrder: number;
        }[];
        createdAt: string;
        updatedAt: string;
    }>;
    update(id: string, dto: UpdateProposalDto): Promise<{
        id: string;
        clientId: string | null;
        client: {
            id: string;
            email: string | null;
            avatarUrl: string | null;
            companyName: string;
            contactName: string | null;
            phone: string | null;
        } | null;
        companyName: string;
        slug: string;
        title: string;
        status: string;
        validUntil: string | null;
        totalValue: number;
        structureContent: string | null;
        structureImageUrls: string[];
        coverVideoUrl: string | null;
        coverImageUrl: string | null;
        schedulingUrl: string | null;
        publishedAt: string | null;
        createdBy: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
        };
        items: {
            id: string;
            name: string;
            description: string | null;
            quantity: number;
            unitPrice: number;
            sortOrder: number;
            subtotal: number;
        }[];
        projects: {
            id: string;
            title: string;
            description: string | null;
            imageUrl: string | null;
            projectUrl: string | null;
            sortOrder: number;
        }[];
        createdAt: string;
        updatedAt: string;
    }>;
    publish(id: string): Promise<{
        publicPath: string;
        id: string;
        clientId: string | null;
        client: {
            id: string;
            email: string | null;
            avatarUrl: string | null;
            companyName: string;
            contactName: string | null;
            phone: string | null;
        } | null;
        companyName: string;
        slug: string;
        title: string;
        status: string;
        validUntil: string | null;
        totalValue: number;
        structureContent: string | null;
        structureImageUrls: string[];
        coverVideoUrl: string | null;
        coverImageUrl: string | null;
        schedulingUrl: string | null;
        publishedAt: string | null;
        createdBy: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
        };
        items: {
            id: string;
            name: string;
            description: string | null;
            quantity: number;
            unitPrice: number;
            sortOrder: number;
            subtotal: number;
        }[];
        projects: {
            id: string;
            title: string;
            description: string | null;
            imageUrl: string | null;
            projectUrl: string | null;
            sortOrder: number;
        }[];
        createdAt: string;
        updatedAt: string;
    }>;
    remove(id: string): Promise<void>;
    private mapItemCreate;
    private mapProjectCreate;
    private slugify;
    private generateUniqueSlug;
    private findBySlugOrId;
    private ensureExists;
    private ensureClientExists;
    private toResponse;
}
