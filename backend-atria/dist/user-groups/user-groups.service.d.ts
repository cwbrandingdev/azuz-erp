import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserGroupDto } from '../users/dto/user.dto';
export declare class UserGroupsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        name: string;
        description: string | null;
        color: string;
        userCount: number;
        members: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
            role: string;
            category: string;
            assignedAt: string;
        }[];
        createdAt: string;
        updatedAt: string;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        color: string;
        userCount: number;
        members: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
            role: string;
            category: string;
            assignedAt: string;
        }[];
        createdAt: string;
        updatedAt: string;
    }>;
    update(id: string, dto: UpdateUserGroupDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        color: string;
        userCount: number;
        members: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
            role: string;
            category: string;
            assignedAt: string;
        }[];
        createdAt: string;
        updatedAt: string;
    }>;
    remove(id: string): Promise<void>;
    addMembers(id: string, memberIds: string[]): Promise<{
        id: string;
        name: string;
        description: string | null;
        color: string;
        userCount: number;
        members: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
            role: string;
            category: string;
            assignedAt: string;
        }[];
        createdAt: string;
        updatedAt: string;
    }>;
    private ensureExists;
    private toResponse;
    private isUniqueConstraintError;
}
