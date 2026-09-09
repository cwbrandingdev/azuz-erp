import { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { ResolveTenantFromHostService } from '../application/resolve-tenant-from-host.service';
type TenantRequest = Request & {
    tenantId?: string;
    tenantSlug?: string;
};
export declare class TenantHostMiddleware implements NestMiddleware {
    private readonly resolveTenantFromHost;
    constructor(resolveTenantFromHost: ResolveTenantFromHostService);
    use(req: TenantRequest, _res: Response, next: NextFunction): Promise<void>;
}
export {};
