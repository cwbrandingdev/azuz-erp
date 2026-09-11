import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { authHeader } from './helpers/bootstrap';
import { getE2E } from './helpers/globals';
import { E2E_RUN_ID } from './helpers/constants';

const ADMIN_ONLY_GET_ROUTES = [
  '/companies',
  '/client-groups',
  '/art-type-pricing',
  '/users',
  '/users/representatives',
  '/client-requests',
  '/client-report-files',
  '/sla/settings',
  '/sla/dashboard',
  '/insights/overview',
];

const DESIGNER_ALLOWED_GET_ROUTES = [
  '/users/members',
  '/content/posts',
  '/assets',
  '/notifications',
  '/agenda-events',
  '/calendar-entries',
  '/user-groups',
  '/messages',
];

describe('P1 authorization (e2e)', () => {
  let app: INestApplication;
  let ctx: ReturnType<typeof getE2E>['ctx'];
  let clientGroupId = '';
  let pricingId = '';
  let userGroupId = '';

  beforeAll(() => {
    ({ app, ctx } = getE2E());
  });

  afterAll(async () => {
    if (pricingId) {
      await request(app.getHttpServer())
        .delete(`/art-type-pricing/${pricingId}`)
        .set(authHeader(ctx.admin.token));
    }
    if (clientGroupId) {
      await request(app.getHttpServer())
        .delete(`/client-groups/${clientGroupId}`)
        .set(authHeader(ctx.admin.token));
    }
    if (userGroupId) {
      await request(app.getHttpServer())
        .delete(`/user-groups/${userGroupId}`)
        .set(authHeader(ctx.admin.token));
    }
  });

  it.each(ADMIN_ONLY_GET_ROUTES)(
    '%s — rejects requests without a token',
    async (path) => {
      await request(app.getHttpServer()).get(path).expect(401);
    },
  );

  it.each(ADMIN_ONLY_GET_ROUTES)(
    '%s — blocks DESIGNER_JUNIOR with a valid token',
    async (path) => {
      await request(app.getHttpServer())
        .get(path)
        .set(authHeader(ctx.designer.token))
        .expect(403);
    },
  );

  it.each(ADMIN_ONLY_GET_ROUTES)(
    '%s — allows ADMIN',
    async (path) => {
      const res = await request(app.getHttpServer())
        .get(path)
        .set(authHeader(ctx.admin.token))
        .expect(200);

      expect(res.body).toBeDefined();
    },
  );

  it.each(DESIGNER_ALLOWED_GET_ROUTES)(
    '%s — still works for DESIGNER_JUNIOR',
    async (path) => {
      const res = await request(app.getHttpServer())
        .get(path)
        .set(authHeader(ctx.designer.token))
        .expect(200);

      expect(res.body).toBeDefined();
    },
  );

  it('GET /public/company — stays public', async () => {
    const res = await request(app.getHttpServer())
      .get('/public/company')
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('GET /messages — rejects unauthenticated access', async () => {
    await request(app.getHttpServer()).get('/messages').expect(401);
  });

  it('POST /leadminer/search — designer cannot use paid lead search', async () => {
    await request(app.getHttpServer())
      .post('/leadminer/search')
      .set(authHeader(ctx.designer.token))
      .send({ query: 'test' })
      .expect(403);
  });

  it('GET /insights/agency — designer is blocked', async () => {
    await request(app.getHttpServer())
      .get('/insights/agency')
      .set(authHeader(ctx.designer.token))
      .expect(403);
  });

  it('PATCH /sla/settings — designer is blocked, admin can update', async () => {
    const current = await request(app.getHttpServer())
      .get('/sla/settings')
      .set(authHeader(ctx.admin.token))
      .expect(200);

    await request(app.getHttpServer())
      .patch('/sla/settings')
      .set(authHeader(ctx.designer.token))
      .send({ slaResponseMediumHours: current.body.slaResponseMediumHours })
      .expect(403);

    const res = await request(app.getHttpServer())
      .patch('/sla/settings')
      .set(authHeader(ctx.admin.token))
      .send({ slaResponseMediumHours: current.body.slaResponseMediumHours })
      .expect(200);

    expect(res.body.slaResponseMediumHours).toBe(
      current.body.slaResponseMediumHours,
    );
  });

  it('POST /client-groups — designer is blocked, admin can create', async () => {
    await request(app.getHttpServer())
      .post('/client-groups')
      .set(authHeader(ctx.designer.token))
      .send({ name: `E2E Blocked Group ${E2E_RUN_ID}` })
      .expect(403);

    const created = await request(app.getHttpServer())
      .post('/client-groups')
      .set(authHeader(ctx.admin.token))
      .send({
        name: `E2E Group ${E2E_RUN_ID}`,
        description: 'P1 auth coverage',
      })
      .expect(201);

    clientGroupId = created.body.id;
    expect(clientGroupId).toBeTruthy();
  });

  it('POST /art-type-pricing — designer is blocked, admin can create', async () => {
    await request(app.getHttpServer())
      .post('/art-type-pricing')
      .set(authHeader(ctx.designer.token))
      .send({ artType: `blocked-${E2E_RUN_ID}`, pricePerPiece: 10 })
      .expect(403);

    const created = await request(app.getHttpServer())
      .post('/art-type-pricing')
      .set(authHeader(ctx.admin.token))
      .send({
        artType: `e2e-${E2E_RUN_ID}`,
        pricePerPiece: 150,
        description: 'P1 auth coverage',
      })
      .expect(201);

    pricingId = created.body.id;
    expect(pricingId).toBeTruthy();
  });

  it('POST /user-groups — designer can list but not create', async () => {
    await request(app.getHttpServer())
      .post('/user-groups')
      .set(authHeader(ctx.designer.token))
      .send({ name: `E2E Blocked User Group ${E2E_RUN_ID}` })
      .expect(403);

    const created = await request(app.getHttpServer())
      .post('/user-groups')
      .set(authHeader(ctx.admin.token))
      .send({ name: `E2E User Group ${E2E_RUN_ID}` })
      .expect(201);

    userGroupId = created.body.id;
    expect(userGroupId).toBeTruthy();
  });

  it('GET /creation/command-center — production staff can still load it', async () => {
    await request(app.getHttpServer())
      .get('/creation/command-center')
      .set(authHeader(ctx.designer.token))
      .expect(200);

    await request(app.getHttpServer())
      .get('/creation/command-center')
      .set(authHeader(ctx.admin.token))
      .expect(200);
  });
});
