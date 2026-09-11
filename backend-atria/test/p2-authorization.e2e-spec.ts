import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { authHeader } from './helpers/bootstrap';
import { getE2E } from './helpers/globals';

const DESIGNER_SELF_GET_ROUTES = [
  '/auth/me',
  '/notifications',
  '/settings/appearance',
  '/app-updates',
  '/suggestions/mine',
  '/tasks',
];

const SENSITIVE_ADMIN_GET_ROUTES = [
  '/finance/overview',
  '/contracts',
  '/users',
  '/companies',
];

describe('P2 authorization (e2e)', () => {
  let app: INestApplication;
  let ctx: ReturnType<typeof getE2E>['ctx'];

  beforeAll(() => {
    ({ app, ctx } = getE2E());
  });

  it('GET /health — stays publicly reachable', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect([200, 503]).toContain(res.status);
  });

  it('GET /settings/branding — stays public', async () => {
    const res = await request(app.getHttpServer())
      .get('/settings/branding')
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('GET /public/company — stays public', async () => {
    await request(app.getHttpServer()).get('/public/company').expect(200);
  });

  it.each(['/docs', '/swagger', '/api-docs'])(
    '%s — swagger is not mounted',
    async (path) => {
      await request(app.getHttpServer()).get(path).expect(404);
    },
  );

  it('GET /api/public/client-portal/:clientId/finances — is no longer public by client id', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/public/client-portal/${ctx.client.id}/finances`,
    );

    expect(res.status).not.toBe(200);
    expect([401, 403, 404]).toContain(res.status);
  });

  it('GET /portal/session/finances — rejects requests without a portal token', async () => {
    await request(app.getHttpServer())
      .get('/portal/session/finances')
      .expect(401);
  });

  it.each(DESIGNER_SELF_GET_ROUTES)(
    '%s — still works for DESIGNER_JUNIOR',
    async (path) => {
      const res = await request(app.getHttpServer())
        .get(path)
        .set(authHeader(ctx.designer.token))
        .expect(200);

      expect(res.body).toBeDefined();
    },
  );

  it.each(DESIGNER_SELF_GET_ROUTES)(
    '%s — rejects requests without a token',
    async (path) => {
      await request(app.getHttpServer()).get(path).expect(401);
    },
  );

  it.each(SENSITIVE_ADMIN_GET_ROUTES)(
    '%s — API (not UI) blocks DESIGNER_JUNIOR',
    async (path) => {
      await request(app.getHttpServer())
        .get(path)
        .set(authHeader(ctx.designer.token))
        .expect(403);
    },
  );

  it.each(SENSITIVE_ADMIN_GET_ROUTES)(
    '%s — allows ADMIN',
    async (path) => {
      const res = await request(app.getHttpServer())
        .get(path)
        .set(authHeader(ctx.admin.token))
        .expect(200);

      expect(res.body).toBeDefined();
    },
  );

  it('GET /tasks — CLIENT cannot list production tasks', async () => {
    await request(app.getHttpServer())
      .get('/tasks')
      .set(authHeader(ctx.clientUser.token))
      .expect(403);
  });

  it('POST /portal/provision/:clientId — designer cannot provision portal access', async () => {
    await request(app.getHttpServer())
      .post(`/portal/provision/${ctx.client.id}`)
      .set(authHeader(ctx.designer.token))
      .send({ password: 'PortalPass123!' })
      .expect(403);
  });

  it('POST /portal/provision/:clientId — rejects requests without a token', async () => {
    await request(app.getHttpServer())
      .post(`/portal/provision/${ctx.client.id}`)
      .send({ password: 'PortalPass123!' })
      .expect(401);
  });
});
