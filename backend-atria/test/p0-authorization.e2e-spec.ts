import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { authHeader } from './helpers/bootstrap';
import { getE2E } from './helpers/globals';
import { E2E_RUN_ID } from './helpers/constants';

const FINANCE_GET_ROUTES = [
  '/finance/overview',
  '/finance/cash-flow',
  '/finance/calendar',
  '/finance/categories',
  '/finance/transactions',
  '/financial/overview',
  '/api/finances/due-today-alerts',
  '/api/finances/monthly-cashflow',
];

const STAFF_GET_ROUTES = [
  ...FINANCE_GET_ROUTES,
  '/contracts',
  '/proposals',
  '/reports',
  '/settings/integrations',
];

describe('P0 authorization (e2e)', () => {
  let app: INestApplication;
  let ctx: ReturnType<typeof getE2E>['ctx'];
  let contractId = '';
  let proposalId = '';

  beforeAll(() => {
    ({ app, ctx } = getE2E());
  });

  afterAll(async () => {
    if (proposalId) {
      await request(app.getHttpServer())
        .delete(`/proposals/${proposalId}`)
        .set(authHeader(ctx.admin.token));
    }
    if (contractId) {
      await request(app.getHttpServer())
        .delete(`/contracts/${contractId}`)
        .set(authHeader(ctx.admin.token));
    }
  });

  it.each(STAFF_GET_ROUTES)(
    '%s — rejects requests without a token',
    async (path) => {
      await request(app.getHttpServer()).get(path).expect(401);
    },
  );

  it.each(STAFF_GET_ROUTES)(
    '%s — blocks DESIGNER_JUNIOR with a valid token',
    async (path) => {
      await request(app.getHttpServer())
        .get(path)
        .set(authHeader(ctx.designer.token))
        .expect(403);
    },
  );

  it.each(STAFF_GET_ROUTES)(
    '%s — allows ADMIN',
    async (path) => {
      const res = await request(app.getHttpServer())
        .get(path)
        .set(authHeader(ctx.admin.token))
        .expect(200);

      expect(res.body).toBeDefined();
    },
  );

  it('POST /finance/transactions — designer cannot create transactions', async () => {
    await request(app.getHttpServer())
      .post('/finance/transactions')
      .set(authHeader(ctx.designer.token))
      .send({
        description: `E2E blocked designer tx ${E2E_RUN_ID}`,
        amount: 10,
        type: 'INCOME',
        status: 'PAID',
        date: '2026-09-11',
        categoryId: ctx.categoryIds.income,
      })
      .expect(403);
  });

  it('GET /settings/branding — stays public', async () => {
    const res = await request(app.getHttpServer())
      .get('/settings/branding')
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        agencyName: expect.any(String),
      }),
    );
  });

  it('PATCH /settings/branding — designer is blocked, admin can update', async () => {
    await request(app.getHttpServer())
      .patch('/settings/branding')
      .set(authHeader(ctx.designer.token))
      .send({ agencyName: 'Blocked Branding' })
      .expect(403);

    const current = await request(app.getHttpServer())
      .get('/settings/branding')
      .set(authHeader(ctx.admin.token))
      .expect(200);

    const res = await request(app.getHttpServer())
      .patch('/settings/branding')
      .set(authHeader(ctx.admin.token))
      .send({ agencyName: current.body.agencyName })
      .expect(200);

    expect(res.body.agencyName).toBe(current.body.agencyName);
  });

  it('PATCH /settings/integrations — designer is blocked, admin can update', async () => {
    await request(app.getHttpServer())
      .patch('/settings/integrations')
      .set(authHeader(ctx.designer.token))
      .send({ notifyOnPostRejected: true })
      .expect(403);

    const res = await request(app.getHttpServer())
      .patch('/settings/integrations')
      .set(authHeader(ctx.admin.token))
      .send({ notifyOnPostRejected: true })
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('GET/PATCH /settings/appearance — still works for the signed-in designer', async () => {
    const current = await request(app.getHttpServer())
      .get('/settings/appearance')
      .set(authHeader(ctx.designer.token))
      .expect(200);

    const res = await request(app.getHttpServer())
      .patch('/settings/appearance')
      .set(authHeader(ctx.designer.token))
      .send({
        primaryColor: current.body.primaryColor,
        accentColor: current.body.accentColor,
        backgroundColor: current.body.backgroundColor,
        textColor: current.body.textColor,
        sidebarColor: current.body.sidebarColor,
      })
      .expect(200);

    expect(res.body.primaryColor).toBe(current.body.primaryColor);
  });

  it('POST /reports/portal-token/:clientId — designer is blocked, admin can mint', async () => {
    await request(app.getHttpServer())
      .post(`/reports/portal-token/${ctx.client.id}`)
      .set(authHeader(ctx.designer.token))
      .expect(403);

    const res = await request(app.getHttpServer())
      .post(`/reports/portal-token/${ctx.client.id}`)
      .set(authHeader(ctx.admin.token))
      .expect(201);

    expect(res.body.clientId).toBe(ctx.client.id);
    expect(res.body.token).toBeTruthy();
    expect(res.body.portalUrl).toContain('/portal/');
  });

  it('POST /reports/generate/:clientId — designer cannot generate reports', async () => {
    await request(app.getHttpServer())
      .post(`/reports/generate/${ctx.client.id}`)
      .set(authHeader(ctx.designer.token))
      .send({ month: 9, year: 2026 })
      .expect(403);
  });

  it('POST /contracts — designer is blocked, admin can create and list', async () => {
    await request(app.getHttpServer())
      .post('/contracts')
      .set(authHeader(ctx.designer.token))
      .send({
        clientId: ctx.client.id,
        title: `E2E Blocked Contract ${E2E_RUN_ID}`,
        recurringValue: 1000,
        startDate: '2026-09-01',
        termsContent: 'Blocked',
      })
      .expect(403);

    const created = await request(app.getHttpServer())
      .post('/contracts')
      .set(authHeader(ctx.admin.token))
      .send({
        clientId: ctx.client.id,
        title: `E2E Contract ${E2E_RUN_ID}`,
        recurringValue: 2500,
        startDate: '2026-09-01',
        termsContent: 'Monthly retainer',
      })
      .expect(201);

    contractId = created.body.id;
    expect(contractId).toBeTruthy();

    const listed = await request(app.getHttpServer())
      .get('/contracts')
      .query({ clientId: ctx.client.id })
      .set(authHeader(ctx.admin.token))
      .expect(200);

    expect(listed.body.some((item: { id: string }) => item.id === contractId)).toBe(
      true,
    );

    await request(app.getHttpServer())
      .get(`/contracts/${contractId}`)
      .set(authHeader(ctx.designer.token))
      .expect(403);
  });

  it('POST /proposals — designer is blocked, admin can still create', async () => {
    await request(app.getHttpServer())
      .post('/proposals')
      .set(authHeader(ctx.designer.token))
      .send({
        title: `E2E Blocked Proposal ${E2E_RUN_ID}`,
        clientId: ctx.client.id,
        items: [{ name: 'Item', quantity: 1, unitPrice: 100 }],
      })
      .expect(403);

    const created = await request(app.getHttpServer())
      .post('/proposals')
      .set(authHeader(ctx.admin.token))
      .send({
        title: `E2E Auth Proposal ${E2E_RUN_ID}`,
        clientId: ctx.client.id,
        items: [{ name: 'Gestão', quantity: 1, unitPrice: 1000 }],
      });

    expect([200, 201]).toContain(created.status);
    proposalId = created.body.id;
    expect(proposalId).toBeTruthy();
  });
});
