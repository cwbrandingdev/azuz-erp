import { Global, MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TENANT_REPOSITORY } from './application/ports/tenant-repository.port';
import { ResolveTenantFromHostService } from './application/resolve-tenant-from-host.service';
import { TenantService } from './application/tenant.service';
import { PrismaTenantRepository } from './infrastructure/prisma-tenant.repository';
import { TenantContextInterceptor } from './presentation/tenant-context.interceptor';
import { TenantHostMiddleware } from './presentation/tenant-host.middleware';
import { TenantsController } from './presentation/tenants.controller';

@Global()
@Module({
  controllers: [TenantsController],
  providers: [
    TenantService,
    ResolveTenantFromHostService,
    TenantHostMiddleware,
    {
      provide: TENANT_REPOSITORY,
      useClass: PrismaTenantRepository,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
  ],
  exports: [TenantService, TENANT_REPOSITORY, ResolveTenantFromHostService],
})
export class TenancyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantHostMiddleware)
      .exclude({ path: 'tenants/:slug', method: RequestMethod.GET })
      .forRoutes('*');
  }
}
