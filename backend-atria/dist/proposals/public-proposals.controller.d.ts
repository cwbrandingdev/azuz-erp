import { ProposalsService } from './proposals.service';
export declare class PublicProposalsController {
    private readonly proposalsService;
    constructor(proposalsService: ProposalsService);
    findPublic(slug: string): Promise<{
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
}
