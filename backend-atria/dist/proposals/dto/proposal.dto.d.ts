import { ProposalStatus } from '@prisma/client';
export declare class ProposalItemDto {
    id?: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    sortOrder?: number;
}
export declare class ProposalProjectDto {
    id?: string;
    title: string;
    description?: string;
    imageUrl?: string;
    projectUrl?: string;
    sortOrder?: number;
}
export declare class CreateProposalDto {
    clientId?: string;
    companyName: string;
    title: string;
    status?: ProposalStatus;
    validUntil?: string;
    totalValue?: number;
    structureContent?: string;
    structureImageUrls?: string[];
    coverVideoUrl?: string;
    coverImageUrl?: string;
    schedulingUrl?: string;
    items?: ProposalItemDto[];
    projects?: ProposalProjectDto[];
}
export declare class UpdateProposalDto {
    clientId?: string;
    companyName?: string;
    title?: string;
    status?: ProposalStatus;
    validUntil?: string | null;
    totalValue?: number;
    structureContent?: string | null;
    structureImageUrls?: string[];
    coverVideoUrl?: string | null;
    coverImageUrl?: string | null;
    schedulingUrl?: string | null;
    items?: ProposalItemDto[];
    projects?: ProposalProjectDto[];
}
export declare class QueryProposalsDto {
    clientId?: string;
    status?: ProposalStatus;
}
