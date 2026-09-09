export interface AuthenticatedUser {
    userId: string;
    email: string;
    role: string;
    category: 'MEMBER' | 'CLIENT';
    clientId: string | null;
    companyId: string | null;
    tenantId: string | null;
    permissions: string[];
    isActive: boolean;
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
