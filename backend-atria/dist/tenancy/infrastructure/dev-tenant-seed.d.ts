import { PrismaClient } from '@prisma/client';
export declare function assertDevSchema(databaseUrl: string | undefined): void;
export declare function seedDevTenant(prisma: PrismaClient): Promise<{
    tenant: {
        id: string;
        name: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
    };
    assigned: number;
}>;
