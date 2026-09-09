import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { runWithTenant } from '../domain/tenant-context';
import { ResolveTenantFromHostService } from '../application/resolve-tenant-from-host.service';

type TenantRequest = Request & {
  tenantId?: string;
  tenantSlug?: string;
};

@Injectable()
export class TenantHostMiddleware implements NestMiddleware {
  constructor(
    private readonly resolveTenantFromHost: ResolveTenantFromHostService,
  ) {}

  async use(req: TenantRequest, _res: Response, next: NextFunction) {
    const tenant = await this.resolveTenantFromHost.resolveOrThrow(
      req.headers as Record<string, string | string[] | undefined>,
    );

    if (!tenant) {
      next();
      return;
    }

    req.tenantId = tenant.id;
    req.tenantSlug = tenant.slug;
    runWithTenant(tenant.id, () => next());
  }
}
