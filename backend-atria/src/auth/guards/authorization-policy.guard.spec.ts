import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationPolicyGuard } from './authorization-policy.guard';
import { ALLOW_AUTHENTICATED_KEY } from '../decorators/allow-authenticated.decorator';
import { ANY_PERMISSIONS_KEY } from '../decorators/any-permissions.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PORTAL_AUTHENTICATED_KEY } from '../decorators/portal-authenticated.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

function createContext(): ExecutionContext {
  return {
    getType: () => 'http',
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}

describe('AuthorizationPolicyGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: AuthorizationPolicyGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    guard = new AuthorizationPolicyGuard(reflector as unknown as Reflector);
  });

  it('allows @Public() routes', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === IS_PUBLIC_KEY ? true : undefined,
    );

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows @AllowAuthenticated() routes', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === ALLOW_AUTHENTICATED_KEY ? true : undefined,
    );

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows @PortalAuthenticated() routes', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === PORTAL_AUTHENTICATED_KEY ? true : undefined,
    );

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows routes with @Roles', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === ROLES_KEY ? ['ADMIN'] : undefined,
    );

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows routes with @Permissions', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === PERMISSIONS_KEY ? ['FINANCE_ACCESS'] : undefined,
    );

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows routes with @AnyPermissions', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === ANY_PERMISSIONS_KEY ? ['KANBAN_OWN_EDIT'] : undefined,
    );

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('denies routes with empty role metadata', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === ROLES_KEY ? [] : undefined,
    );

    expect(() => guard.canActivate(createContext())).toThrow(
      ForbiddenException,
    );
  });

  it('denies routes with no authorization policy', () => {
    expect(() => guard.canActivate(createContext())).toThrow(
      ForbiddenException,
    );
  });
});
