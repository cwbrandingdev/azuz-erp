import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { getCurrentTenantId, runWithTenant } from '../domain/tenant-context';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      tenantId?: string;
    }>();
    const activeTenantId = getCurrentTenantId();
    const hostTenantId = activeTenantId ?? request.tenantId;
    const jwtTenantId = request.user?.tenantId ?? undefined;

    if (hostTenantId && jwtTenantId && hostTenantId !== jwtTenantId) {
      throw new ForbiddenException('Tenant mismatch');
    }

    const tenantId = hostTenantId ?? jwtTenantId;
    if (!tenantId) {
      return next.handle();
    }

    if (activeTenantId) {
      return next.handle();
    }

    return new Observable((subscriber) => {
      const subscription = runWithTenant(tenantId, () =>
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (error) => subscriber.error(error),
          complete: () => subscriber.complete(),
        }),
      );

      return () => subscription.unsubscribe();
    });
  }
}
