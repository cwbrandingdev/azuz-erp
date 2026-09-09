import { PrismaClient } from '@prisma/client';
export declare function createTenantIsolationExtension(base: PrismaClient): (client: any) => {
    $extends: {
        extArgs: import("@prisma/client/runtime/library").InternalArgs<unknown, unknown, {}, unknown>;
    };
};
