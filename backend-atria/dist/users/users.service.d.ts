import { ConfigService } from '@nestjs/config';
import { FinanceService } from '../finance/finance.service';
import { CrmScopeService } from '../leads/crm-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../supabase/supabase-storage.service';
import { ProvisionUserDto, UpdateUserDto } from './dto/user.dto';
export declare class UsersService {
    private readonly prisma;
    private readonly configService;
    private readonly financeService;
    private readonly storage;
    private readonly crmScope;
    constructor(prisma: PrismaService, configService: ConfigService, financeService: FinanceService, storage: SupabaseStorageService, crmScope: CrmScopeService);
    findAll(): Promise<{
        createdAt: string;
        crmIncludeInternal: boolean;
        crmScopeClientIds: string[];
        id: string;
        name: string;
        email: string;
        role: string;
        category: string;
        permissions: string[];
        avatarUrl: string | null;
        clientId: string | null;
        client: {
            id: string;
            companyName: string;
        } | null;
        monthlySalary: number | null;
        mustChangePassword: boolean;
        hasChangedPassword: boolean;
        isActive: boolean;
        isFirstLogin: boolean;
        temporaryPassword: string | null;
        userGroup: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        } | null;
        userGroups: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        }[];
    }[]>;
    findMembers(): Promise<{
        activeTaskCount: number;
        createdAt: string;
        crmIncludeInternal: boolean;
        crmScopeClientIds: string[];
        id: string;
        name: string;
        email: string;
        role: string;
        category: string;
        permissions: string[];
        avatarUrl: string | null;
        clientId: string | null;
        client: {
            id: string;
            companyName: string;
        } | null;
        monthlySalary: number | null;
        mustChangePassword: boolean;
        hasChangedPassword: boolean;
        isActive: boolean;
        isFirstLogin: boolean;
        temporaryPassword: string | null;
        userGroup: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        } | null;
        userGroups: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        }[];
    }[]>;
    findUsersForClient(clientId: string): Promise<{
        portalAccess: string;
        activeDeliverableCount: number;
        createdAt: string;
        crmIncludeInternal: boolean;
        crmScopeClientIds: string[];
        id: string;
        name: string;
        email: string;
        role: string;
        category: string;
        permissions: string[];
        avatarUrl: string | null;
        clientId: string | null;
        client: {
            id: string;
            companyName: string;
        } | null;
        monthlySalary: number | null;
        mustChangePassword: boolean;
        hasChangedPassword: boolean;
        isActive: boolean;
        isFirstLogin: boolean;
        temporaryPassword: string | null;
        userGroup: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        } | null;
        userGroups: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        }[];
    }[]>;
    getClientAccessBundle(clientId: string): Promise<{
        users: {
            portalAccess: string;
            activeDeliverableCount: number;
            createdAt: string;
            crmIncludeInternal: boolean;
            crmScopeClientIds: string[];
            id: string;
            name: string;
            email: string;
            role: string;
            category: string;
            permissions: string[];
            avatarUrl: string | null;
            clientId: string | null;
            client: {
                id: string;
                companyName: string;
            } | null;
            monthlySalary: number | null;
            mustChangePassword: boolean;
            hasChangedPassword: boolean;
            isActive: boolean;
            isFirstLogin: boolean;
            temporaryPassword: string | null;
            userGroup: {
                id: string;
                name: string;
                description: string | null;
                color: string;
            } | null;
            userGroups: {
                id: string;
                name: string;
                description: string | null;
                color: string;
            }[];
        }[];
        legacyPortal: {
            email: string;
            mustChangePassword: boolean;
            loginUrl: string;
            createdAt: string;
            updatedAt: string;
        } | null;
        platformLoginUrl: string;
    }>;
    findClients(): Promise<{
        portalAccess: string;
        activeDeliverableCount: number;
        createdAt: string;
        crmIncludeInternal: boolean;
        crmScopeClientIds: string[];
        id: string;
        name: string;
        email: string;
        role: string;
        category: string;
        permissions: string[];
        avatarUrl: string | null;
        clientId: string | null;
        client: {
            id: string;
            companyName: string;
        } | null;
        monthlySalary: number | null;
        mustChangePassword: boolean;
        hasChangedPassword: boolean;
        isActive: boolean;
        isFirstLogin: boolean;
        temporaryPassword: string | null;
        userGroup: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        } | null;
        userGroups: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        }[];
    }[]>;
    provision(dto: ProvisionUserDto, createdByUserId: string): Promise<{
        user: {
            createdAt: string;
            crmIncludeInternal: boolean;
            crmScopeClientIds: string[];
            id: string;
            name: string;
            email: string;
            role: string;
            category: string;
            permissions: string[];
            avatarUrl: string | null;
            clientId: string | null;
            client: {
                id: string;
                companyName: string;
            } | null;
            monthlySalary: number | null;
            mustChangePassword: boolean;
            hasChangedPassword: boolean;
            isActive: boolean;
            isFirstLogin: boolean;
            temporaryPassword: string | null;
            userGroup: {
                id: string;
                name: string;
                description: string | null;
                color: string;
            } | null;
            userGroups: {
                id: string;
                name: string;
                description: string | null;
                color: string;
            }[];
        };
        credentials: {
            email: string;
            temporaryPassword: string;
        };
    }>;
    update(id: string, dto: UpdateUserDto): Promise<{
        createdAt: string;
        crmIncludeInternal: boolean;
        crmScopeClientIds: string[];
        id: string;
        name: string;
        email: string;
        role: string;
        category: string;
        permissions: string[];
        avatarUrl: string | null;
        clientId: string | null;
        client: {
            id: string;
            companyName: string;
        } | null;
        monthlySalary: number | null;
        mustChangePassword: boolean;
        hasChangedPassword: boolean;
        isActive: boolean;
        isFirstLogin: boolean;
        temporaryPassword: string | null;
        userGroup: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        } | null;
        userGroups: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        }[];
    }>;
    uploadAvatar(id: string, file: Express.Multer.File): Promise<{
        createdAt: string;
        crmIncludeInternal: boolean;
        crmScopeClientIds: string[];
        id: string;
        name: string;
        email: string;
        role: string;
        category: string;
        permissions: string[];
        avatarUrl: string | null;
        clientId: string | null;
        client: {
            id: string;
            companyName: string;
        } | null;
        monthlySalary: number | null;
        mustChangePassword: boolean;
        hasChangedPassword: boolean;
        isActive: boolean;
        isFirstLogin: boolean;
        temporaryPassword: string | null;
        userGroup: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        } | null;
        userGroups: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        }[];
    }>;
    removeAvatar(id: string): Promise<{
        createdAt: string;
        crmIncludeInternal: boolean;
        crmScopeClientIds: string[];
        id: string;
        name: string;
        email: string;
        role: string;
        category: string;
        permissions: string[];
        avatarUrl: string | null;
        clientId: string | null;
        client: {
            id: string;
            companyName: string;
        } | null;
        monthlySalary: number | null;
        mustChangePassword: boolean;
        hasChangedPassword: boolean;
        isActive: boolean;
        isFirstLogin: boolean;
        temporaryPassword: string | null;
        userGroup: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        } | null;
        userGroups: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        }[];
    }>;
    deactivate(id: string): Promise<{
        createdAt: string;
        crmIncludeInternal: boolean;
        crmScopeClientIds: string[];
        id: string;
        name: string;
        email: string;
        role: string;
        category: string;
        permissions: string[];
        avatarUrl: string | null;
        clientId: string | null;
        client: {
            id: string;
            companyName: string;
        } | null;
        monthlySalary: number | null;
        mustChangePassword: boolean;
        hasChangedPassword: boolean;
        isActive: boolean;
        isFirstLogin: boolean;
        temporaryPassword: string | null;
        userGroup: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        } | null;
        userGroups: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        }[];
    }>;
    findRepresentatives(): Promise<{
        id: string;
        title: string | null;
        isPrimary: boolean;
        createdAt: string;
        updatedAt: string;
        user: {
            createdAt: string;
            crmIncludeInternal: boolean;
            crmScopeClientIds: string[];
            id: string;
            name: string;
            email: string;
            role: string;
            category: string;
            permissions: string[];
            avatarUrl: string | null;
            clientId: string | null;
            client: {
                id: string;
                companyName: string;
            } | null;
            monthlySalary: number | null;
            mustChangePassword: boolean;
            hasChangedPassword: boolean;
            isActive: boolean;
            isFirstLogin: boolean;
            temporaryPassword: string | null;
            userGroup: {
                id: string;
                name: string;
                description: string | null;
                color: string;
            } | null;
            userGroups: {
                id: string;
                name: string;
                description: string | null;
                color: string;
            }[];
        };
    }[]>;
    private ensureCompanyRepresentative;
    updateAvatar(id: string, avatarUrl: string | null): Promise<{
        createdAt: string;
        crmIncludeInternal: boolean;
        crmScopeClientIds: string[];
        id: string;
        name: string;
        email: string;
        role: string;
        category: string;
        permissions: string[];
        avatarUrl: string | null;
        clientId: string | null;
        client: {
            id: string;
            companyName: string;
        } | null;
        monthlySalary: number | null;
        mustChangePassword: boolean;
        hasChangedPassword: boolean;
        isActive: boolean;
        isFirstLogin: boolean;
        temporaryPassword: string | null;
        userGroup: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        } | null;
        userGroups: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        }[];
    }>;
    private persistAvatarFile;
    private deleteStoredAvatar;
    private resolveImageExtension;
    private assertCrmScopeInput;
    private snapshotFromRelations;
    private generateUniqueEmail;
    private toUserResponse;
}
