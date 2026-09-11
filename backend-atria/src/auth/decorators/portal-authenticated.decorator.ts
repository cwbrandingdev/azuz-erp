import { SetMetadata } from '@nestjs/common';

export const PORTAL_AUTHENTICATED_KEY = 'portalAuthenticated';
export const PortalAuthenticated = () =>
  SetMetadata(PORTAL_AUTHENTICATED_KEY, true);
