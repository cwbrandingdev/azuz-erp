import { RoleName } from '@prisma/client';
export declare class CreateUserGroupDto {
    name: string;
    description?: string;
    color?: string;
    memberIds?: string[];
}
export declare class UpdateUserGroupDto {
    name?: string;
    description?: string;
    color?: string;
}
export declare class ProvisionUserDto {
    name: string;
    role: RoleName;
    userGroupId?: string;
    userGroupIds?: string[];
    password?: string;
    monthlySalary?: number;
    emailDomain?: string;
    clientId?: string;
    email?: string;
    avatarUrl?: string;
    crmScopeClientIds?: string[];
    crmIncludeInternal?: boolean;
}
export declare class UpdateUserDto {
    email?: string;
    userGroupId?: string | null;
    userGroupIds?: string[];
    role?: RoleName;
    monthlySalary?: number | null;
    clientId?: string | null;
    avatarUrl?: string | null;
    crmScopeClientIds?: string[];
    crmIncludeInternal?: boolean;
}
export declare class AddUserGroupMembersDto {
    memberIds: string[];
}
