import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ProvisionUserDto, UpdateUserDto, UpdateWhatsappColorDto } from './dto/user.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
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
    provision(user: AuthenticatedUser, dto: ProvisionUserDto): Promise<{
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
    uploadMyAvatar(user: AuthenticatedUser, file: Express.Multer.File): Promise<{
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
    removeMyAvatar(user: AuthenticatedUser): Promise<{
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
    getMyWhatsappColor(user: AuthenticatedUser): Promise<{
        color: string | null;
    }>;
    setMyWhatsappColor(user: AuthenticatedUser, dto: UpdateWhatsappColorDto): Promise<{
        color: string | null;
    }>;
    uploadUserAvatar(id: string, file: Express.Multer.File): Promise<{
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
    deactivate(id: string, user: AuthenticatedUser): Promise<{
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
}
