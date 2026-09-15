import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { authHeader } from './helpers/bootstrap';
import { getE2E } from './helpers/globals';
import { E2E_RUN_ID } from './helpers/constants';

describe('Proposals (e2e)', () => {
  let app: INestApplication;
  let ctx: ReturnType<typeof getE2E>['ctx'];
  let proposalId: string;

  beforeAll(() => {
    ({ app, ctx } = getE2E());
  });

  afterAll(async () => {
    if (!proposalId) return;
    await request(app.getHttpServer())
      .delete(`/proposals/${proposalId}`)
      .set(authHeader(ctx.admin.token));
  });

  it('POST /proposals — creates draft proposal', async () => {
    const res = await request(app.getHttpServer())
      .post('/proposals')
      .set(authHeader(ctx.admin.token))
      .send({
        companyName: `Empresa E2E ${E2E_RUN_ID}`,
        title: `E2E Proposal ${E2E_RUN_ID}`,
        clientId: ctx.client.id,
        structureContent: 'Audit proposal structure',
        items: [
          {
            name: 'Gestão de redes',
            description: 'Mensal',
            quantity: 1,
            unitPrice: 2500,
          },
          {
            name: 'Produção de conteúdo',
            description: 'Pacote',
            quantity: 1,
            unitPrice: 1800,
          },
          {
            name: 'Tráfego pago',
            description: 'Campanhas',
            quantity: 1,
            unitPrice: 1200,
          },
        ],
        projects: [
          {
            title: 'Lançamento',
            description: 'Campanha',
            sortOrder: 0,
          },
        ],
      });

    expect([200, 201]).toContain(res.status);
    proposalId = res.body.id;
    expect(proposalId).toBeTruthy();
    expect(res.body.title).toContain('E2E Proposal');
  });

  it('GET /public/proposals/:id — hides draft proposals', async () => {
    await request(app.getHttpServer())
      .get(`/public/proposals/${proposalId}`)
      .expect(404);
  });

  it('PATCH /proposals/:id/publish — makes proposal public', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/proposals/${proposalId}/publish`)
      .set(authHeader(ctx.admin.token))
      .expect(200);

    expect(String(res.body.status).toLowerCase()).toMatch(/publish|sent/);
    expect(res.body.publicPath).toMatch(/^\/p\//);
    expect(res.body.slug).toBeTruthy();
  });

  it('GET /public/proposals/:slug — returns published proposal payload', async () => {
    const published = await request(app.getHttpServer())
      .get(`/proposals/${proposalId}`)
      .set(authHeader(ctx.admin.token))
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/public/proposals/${published.body.slug}`)
      .expect(200);

    expect(res.body.id).toBe(proposalId);
    expect(res.body.title).toContain('E2E Proposal');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(3);
  });
});
