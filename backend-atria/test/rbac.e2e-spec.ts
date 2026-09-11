import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { authHeader } from './helpers/bootstrap';
import { getE2E } from './helpers/globals';
import { E2E_RUN_ID } from './helpers/constants';

describe('RBAC & Client isolation (e2e)', () => {
  let app: INestApplication;
  let ctx: ReturnType<typeof getE2E>['ctx'];
  let otherClientPostId: string;

  beforeAll(async () => {
    ({ app, ctx } = getE2E());
    const res = await request(app.getHttpServer())
      .post('/content/posts')
      .set(authHeader(ctx.admin.token))
      .send({
        title: `E2E Other Client Post ${E2E_RUN_ID}`,
        clientId: ctx.otherClient.id,
        platform: 'INSTAGRAM',
        copy: 'Other client content',
        status: 'PENDING_APPROVAL',
      });

    otherClientPostId = res.body.id;
  });

  it('GET /client-portal — client user accesses own portal dashboard', async () => {
    const res = await request(app.getHttpServer())
      .get('/client-portal')
      .set(authHeader(ctx.clientUser.token))
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('GET /clients — blocks CLIENT role from staff API', async () => {
    await request(app.getHttpServer())
      .get('/clients')
      .set(authHeader(ctx.clientUser.token))
      .expect(403);
  });

  it('GET /finance/transactions — blocks CLIENT role from finance API', async () => {
    await request(app.getHttpServer())
      .get('/finance/transactions')
      .set(authHeader(ctx.clientUser.token))
      .expect(403);
  });

  it('GET /finance/transactions — blocks DESIGNER_JUNIOR even with a valid token', async () => {
    await request(app.getHttpServer())
      .get('/finance/transactions')
      .set(authHeader(ctx.designer.token))
      .expect(403);
  });

  it('GET /reports — blocks DESIGNER_JUNIOR from staff reports', async () => {
    await request(app.getHttpServer())
      .get('/reports')
      .set(authHeader(ctx.designer.token))
      .expect(403);
  });

  it('GET /users — blocks DESIGNER_JUNIOR from full user admin list', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .set(authHeader(ctx.designer.token))
      .expect(403);
  });

  it('GET /users/members — still allows DESIGNER_JUNIOR assignment directory', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/members')
      .set(authHeader(ctx.designer.token))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('PATCH /client-portal/posts/:id/approve — cannot approve other client post', async () => {
    await request(app.getHttpServer())
      .patch(`/client-portal/posts/${otherClientPostId}/approve`)
      .set(authHeader(ctx.clientUser.token))
      .expect(404);
  });

  it('GET /client-portal/calendar — client scoped calendar loads', async () => {
    await request(app.getHttpServer())
      .get('/client-portal/calendar')
      .set(authHeader(ctx.clientUser.token))
      .expect(200);
  });

  it('GET /auth/me — client can read own profile', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set(authHeader(ctx.clientUser.token))
      .expect(200);

    expect(res.body.clientId).toBe(ctx.clientUser.clientId);
    expect(res.body.role).toBe('CLIENT');
  });
});
