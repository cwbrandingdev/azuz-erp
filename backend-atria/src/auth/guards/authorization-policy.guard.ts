import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_AUTHENTICATED_KEY } from '../decorators/allow-authenticated.decorator';
import { ANY_PERMISSIONS_KEY } from '../decorators/any-permissions.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PORTAL_AUTHENTICATED_KEY } from '../decorators/portal-authenticated.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class AuthorizationPolicyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    if (
      this.reflector.getAllAndOverride<boolean>(
        ALLOW_AUTHENTICATED_KEY,
        targets,
      )
    ) {
      return true;
    }

    if (
      this.reflector.getAllAndOverride<boolean>(
        PORTAL_AUTHENTICATED_KEY,
        targets,
      )
    ) {
      return true;
    }

    const roles = this.reflector.getAllAndOverride<unknown[]>(
      ROLES_KEY,
      targets,
    );
    if (Array.isArray(roles) && roles.length > 0) {
      return true;
    }

    const permissions = this.reflector.getAllAndOverride<unknown[]>(
      PERMISSIONS_KEY,
      targets,
    );
    if (Array.isArray(permissions) && permissions.length > 0) {
      return true;
    }

    const anyPermissions = this.reflector.getAllAndOverride<unknown[]>(
      ANY_PERMISSIONS_KEY,
      targets,
    );
    if (Array.isArray(anyPermissions) && anyPermissions.length > 0) {
      return true;
    }

    throw new ForbiddenException(
      'This endpoint is missing an authorization policy',
    );
  }
}
