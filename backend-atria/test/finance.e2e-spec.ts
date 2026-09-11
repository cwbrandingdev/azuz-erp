import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { authHeader } from './helpers/bootstrap';
import { getE2E } from './helpers/globals';
import { E2E_RUN_ID } from './helpers/constants';

describe('Finance (e2e)', () => {
  let app: INestApplication;
  let ctx: ReturnType<typeof getE2E>['ctx'];
  let paidTransactionId: string;
  let pendingTransactionId: string;

  beforeAll(() => {
    ({ app, ctx } = getE2E());
  });

  it('GET /finance/overview — returns period totals for admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/finance/overview')
      .query({ month: 7, year: 2026 })
      .set(authHeader(ctx.admin.token))
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('GET /finance/cash-flow — returns cash flow for admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/finance/cash-flow')
      .query({ month: 7, year: 2026 })
      .set(authHeader(ctx.admin.token))
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('GET /finance/calendar — returns calendar payload for admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/finance/calendar')
      .query({ month: 7, year: 2026 })
      .set(authHeader(ctx.admin.token))
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('GET /api/finances/due-today-alerts — returns alerts for admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/finances/due-today-alerts')
      .set(authHeader(ctx.admin.token))
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('GET /api/finances/monthly-cashflow — returns monthly cashflow for admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/finances/monthly-cashflow')
      .query({ month: 7, year: 2026 })
      .set(authHeader(ctx.admin.token))
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('GET /finance/categories — lists categories', async () => {
    const res = await request(app.getHttpServer())
      .get('/finance/categories')
      .set(authHeader(ctx.admin.token))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('POST /finance/transactions — creates paid income transaction', async () => {
    const res = await request(app.getHttpServer())
      .post('/finance/transactions')
      .set(authHeader(ctx.admin.token))
      .send({
        description: `E2E paid income ${E2E_RUN_ID}`,
        amount: 1500.5,
        type: 'INCOME',
        status: 'PAID',
        date: '2026-07-28',
        categoryId: ctx.categoryIds.income,
      })
      .expect(201);

    expect(res.body.status).toBe('paid');
    expect(res.body.categoryId).toBe(ctx.categoryIds.income);
    paidTransactionId = res.body.id;
  });

  it('POST /finance/transactions — creates pending expense transaction', async () => {
    const res = await request(app.getHttpServer())
      .post('/finance/transactions')
      .set(authHeader(ctx.admin.token))
      .send({
        description: `E2E pending expense ${E2E_RUN_ID}`,
        amount: 320,
        type: 'EXPENSE',
        status: 'PENDING',
        date: '2026-07-28',
        dueDate: '2026-08-15',
        categoryId: ctx.categoryIds.expense,
      })
      .expect(201);

    expect(res.body.status).toBe('pending');
    expect(res.body.categoryId).toBe(ctx.categoryIds.expense);
    pendingTransactionId = res.body.id;
  });

  it('PATCH /finance/transactions/:id — marks pending as paid', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/finance/transactions/${pendingTransactionId}`)
      .set(authHeader(ctx.admin.token))
      .send({ status: 'PAID' })
      .expect(200);

    expect(res.body.status).toBe('paid');
  });

  it('GET /finance/transactions — returns created transactions', async () => {
    const res = await request(app.getHttpServer())
      .get('/finance/transactions')
      .set(authHeader(ctx.admin.token))
      .expect(200);

    const ids = res.body.data.map((item: { id: string }) => item.id);
    expect(ids).toEqual(expect.arrayContaining([paidTransactionId, pendingTransactionId]));
  });
});
