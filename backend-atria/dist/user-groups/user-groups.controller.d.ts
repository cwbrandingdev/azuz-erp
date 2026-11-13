import { UpdateUserGroupDto, AddUserGroupMembersDto } from '../users/dto/user.dto';
import { UserGroupsService } from './user-groups.service';
export declare class UserGroupsController {
    private readonly userGroupsService;
    constructor(userGroupsService: UserGroupsService);
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
    addMembers(id: string, dto: AddUserGroupMembersDto): Promise<{
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
}
