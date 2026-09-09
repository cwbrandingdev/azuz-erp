import { ConfigService } from '@nestjs/config';
import type { Tenant } from '../domain/tenant.entity';
import { TenantService } from './tenant.service';
export type HostTenantResolution = {
    kind: 'none';
} | {
    kind: 'unknown';
    slug: string;
} | {
    kind: 'found';
    tenant: Tenant;
};
export declare class ResolveTenantFromHostService {
    private readonly configService;
    private readonly tenants;
    constructor(configService: ConfigService, tenants: TenantService);
    resolveSlug(headers: Record<string, string | string[] | undefined>): string | null;
    resolve(headers: Record<string, string | string[] | undefined>): Promise<HostTenantResolution>;
    resolveOrThrow(headers: Record<string, string | string[] | undefined>): Promise<Tenant | undefined>;
    private baseDomains;
}
