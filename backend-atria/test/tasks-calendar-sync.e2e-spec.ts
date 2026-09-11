import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { authHeader } from './helpers/bootstrap';
import { getE2E } from './helpers/globals';
import { E2E_RUN_ID } from './helpers/constants';
import { PrismaService } from '../src/prisma/prisma.service';
import { KanbanTaskStatus } from '@prisma/client';

describe('Tasks / Kanban / Calendar sync (e2e)', () => {
  let app: INestApplication;
  let ctx: ReturnType<typeof getE2E>['ctx'];
  let prisma: PrismaService;
  let faltaGravarColumnId: string;
  let okColumnId: string;
  let createdTaskId = '';
  let createdScheduledTaskId = '';
  let createdKanbanCalendarTaskId = '';
  let createdEventId: string | null;

  beforeAll(async () => {
    ({ app, ctx } = getE2E());
    prisma = app.get(PrismaService);

    await request(app.getHttpServer())
      .get('/kanban/columns')
      .set(authHeader(ctx.admin.token))
      .expect(200);

    const falta = await prisma.kanbanColumn.findFirst({
      where: { statusKey: KanbanTaskStatus.FALTA_GRAVAR },
    });
    const ok = await prisma.kanbanColumn.findFirst({
      where: { statusKey: KanbanTaskStatus.OK },
    });

    if (!falta || !ok) {
      throw new Error('Status columns missing — ensure kanban defaults seeded');
    }

    faltaGravarColumnId = falta.id;
    okColumnId = ok.id;
  });

  afterAll(async () => {
    const ids = [
      createdTaskId,
      createdScheduledTaskId,
      createdKanbanCalendarTaskId,
    ].filter(Boolean);
    if (ids.length > 0) {
      await prisma.kanbanTask.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it('POST /kanban/tasks — scheduled task also appears on the calendar', async () => {
    const publicationDate = new Date('2026-08-27T15:00:00.000Z').toISOString();

    const created = await request(app.getHttpServer())
      .post('/kanban/tasks')
      .set(authHeader(ctx.admin.token))
      .send({
        title: `E2E Kanban Calendar Sync ${E2E_RUN_ID}`,
        clientId: ctx.client.id,
        publicationDate,
      })
      .expect(201);

    createdKanbanCalendarTaskId = created.body.id;
    expect(created.body.calendarEventId).toBeTruthy();
    expect(created.body.publicationDate).toBe(publicationDate);

    const events = await request(app.getHttpServer())
      .get('/calendar/events')
      .query({
        from: '2026-08-27T00:00:00.000Z',
        to: '2026-08-27T23:59:59.999Z',
        clientId: ctx.client.id,
      })
      .set(authHeader(ctx.admin.token))
      .expect(200);

    const match = events.body.find(
      (event: { kanbanTaskId: string | null; title?: string }) =>
        event.kanbanTaskId === createdKanbanCalendarTaskId,
    );
    expect(match).toBeDefined();
    expect(match.startAt).toBe(publicationDate);
    expect(String(match.title)).toContain('E2E Kanban Calendar Sync');
  });

  it('POST /tasks — creates with default Em produção / Roteiro without calendar link', async () => {
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set(authHeader(ctx.admin.token))
      .send({
        title: `E2E Task Sync ${E2E_RUN_ID}`,
        description: 'Created via tasks API',
        clientId: ctx.client.id,
        priority: 'MEDIUM',
      })
      .expect(201);

    createdTaskId = res.body.id;
    createdEventId = res.body.calendarEventId;

    expect(res.body.status).toBe('falta_gravar');
    expect(res.body.productionPhase).toBe('roteiro');
    expect(res.body.contentType).toBe('video_with_script');
    expect(res.body.columnId).toBe(faltaGravarColumnId);
    expect(res.body.statusColor).toBe('#92400E');
    expect(res.body.statusLabel).toBe('Roteiro');
    expect(res.body.slaStatus).toBeDefined();
    expect(createdEventId).toBeFalsy();
  });

  it('POST /tasks — scheduled dates appear on the calendar without a column payload', async () => {
    const publicationDate = new Date('2026-08-25T10:00:00.000Z').toISOString();
    const deliveryDate = new Date('2026-08-25T18:00:00.000Z').toISOString();

    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set(authHeader(ctx.admin.token))
      .send({
        title: `E2E Task Calendar ${E2E_RUN_ID}`,
        contentType: 'CAROUSEL',
        clientId: ctx.client.id,
        publicationDate,
        deliveryDate,
      })
      .expect(201);

    createdScheduledTaskId = res.body.id;

    expect(res.body.columnId).toBe(faltaGravarColumnId);
    expect(res.body.status).toBe('falta_gravar');
    expect(res.body.contentType).toBe('carousel');
    expect(res.body.productionPhase).toBe('em_gravacao');
    expect(res.body.statusLabel).toBe('Em gravação');
    expect(res.body.publicationDate).toBe(publicationDate);
    expect(res.body.deliveryDate).toBe(deliveryDate);
    expect(res.body.calendarEventId).toBeTruthy();

    const events = await request(app.getHttpServer())
      .get('/calendar/events')
      .query({
        from: '2026-08-25T00:00:00.000Z',
        to: '2026-08-25T23:59:59.999Z',
        clientId: ctx.client.id,
      })
      .set(authHeader(ctx.admin.token))
      .expect(200);

    const match = events.body.find(
      (event: { kanbanTaskId: string | null }) =>
        event.kanbanTaskId === createdScheduledTaskId,
    );
    expect(match).toBeDefined();
    expect(match.publicationDate).toBe(publicationDate);
    expect(match.startAt).toBe(publicationDate);
  });

  it('GET /calendar/events — excludes tasks without publicationDate and returns them as unmapped', async () => {
    const from = '2026-08-01T00:00:00.000Z';
    const to = '2026-08-31T23:59:59.999Z';

    const grid = await request(app.getHttpServer())
      .get('/calendar/events')
      .query({ from, to, clientId: ctx.client.id })
      .set(authHeader(ctx.admin.token))
      .expect(200);

    expect(Array.isArray(grid.body)).toBe(true);
    expect(
      grid.body.some(
        (event: { kanbanTaskId: string | null }) =>
          event.kanbanTaskId === createdTaskId,
      ),
    ).toBe(false);

    const withUnmapped = await request(app.getHttpServer())
      .get('/calendar/events')
      .query({ from, to, clientId: ctx.client.id, includeUnmapped: true })
      .set(authHeader(ctx.admin.token))
      .expect(200);

    expect(Array.isArray(withUnmapped.body.events)).toBe(true);
    expect(Array.isArray(withUnmapped.body.unmapped)).toBe(true);
    expect(
      withUnmapped.body.unmapped.some(
        (task: { id: string; publicationDate: string | null }) =>
          task.id === createdTaskId && task.publicationDate === null,
      ),
    ).toBe(true);
  });

  it('PATCH /kanban/tasks/:id — publicationDate links the task to the calendar grid', async () => {
    const publicationDate = new Date('2026-08-19T10:00:00.000Z').toISOString();
    const res = await request(app.getHttpServer())
      .patch(`/kanban/tasks/${createdTaskId}`)
      .set(authHeader(ctx.admin.token))
      .send({ publicationDate })
      .expect(200);

    createdEventId = res.body.calendarEventId;
    expect(createdEventId).toBeTruthy();
    expect(res.body.publicationDate).toBe(publicationDate);

    const events = await request(app.getHttpServer())
      .get('/calendar/events')
      .query({
        from: '2026-08-19T00:00:00.000Z',
        to: '2026-08-19T23:59:59.999Z',
        clientId: ctx.client.id,
      })
      .set(authHeader(ctx.admin.token))
      .expect(200);

    const match = events.body.find(
      (event: { kanbanTaskId: string | null }) =>
        event.kanbanTaskId === createdTaskId,
    );
    expect(match).toBeDefined();
    expect(match.publicationDate).toBe(publicationDate);
    expect(match.startAt).toBe(publicationDate);
  });

  it('GET /tasks — lists created task', async () => {
    const res = await request(app.getHttpServer())
      .get('/tasks')
      .set(authHeader(ctx.admin.token))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((task: { id: string }) => task.id === createdTaskId)).toBe(
      true,
    );
  });

  it('PATCH /tasks/:id/status — updates to OK and syncs calendar color', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/tasks/${createdTaskId}/status`)
      .set(authHeader(ctx.admin.token))
      .send({ status: 'OK' })
      .expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.statusColor).toBe('#22C55E');
    expect(res.body.columnId).toBe(okColumnId);

    if (createdEventId) {
      const event = await prisma.calendarEvent.findUnique({
        where: { id: createdEventId },
      });
      expect(event?.color).toBe('#22C55E');
    }
  });

  it('PATCH /kanban/tasks/:id — updates title/description/dueDate', async () => {
    const dueDate = new Date('2026-08-20T15:00:00.000Z').toISOString();
    const res = await request(app.getHttpServer())
      .patch(`/kanban/tasks/${createdTaskId}`)
      .set(authHeader(ctx.admin.token))
      .send({
        title: `E2E Task Sync Updated ${E2E_RUN_ID}`,
        description: 'Updated description',
        dueDate,
      })
      .expect(200);

    expect(res.body.title).toContain('Updated');
    expect(res.body.description).toBe('Updated description');
    expect(res.body.dueDate).toBeTruthy();
  });

  it('PATCH /kanban/tasks/:id/move — drag to Falta gravar column', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/kanban/tasks/${createdTaskId}/move`)
      .set(authHeader(ctx.admin.token))
      .send({ columnId: faltaGravarColumnId, order: 0 })
      .expect(200);

    expect(res.body.columnId).toBe(faltaGravarColumnId);
    expect(res.body.status).toBe('falta_gravar');
  });

  it('POST /calendar/events — creates linked kanban task with Falta gravar', async () => {
    const startAt = new Date('2026-08-21T10:00:00.000Z').toISOString();
    const endAt = new Date('2026-08-21T11:00:00.000Z').toISOString();

    const res = await request(app.getHttpServer())
      .post('/calendar/events')
      .set(authHeader(ctx.admin.token))
      .send({
        title: `E2E Calendar Event ${E2E_RUN_ID}`,
        startAt,
        endAt,
        category: 'MEETING',
        clientId: ctx.client.id,
      })
      .expect(201);

    expect(res.body.kanbanTaskId).toBeTruthy();
    expect(res.body.taskStatus).toBe('falta_gravar');
    expect(res.body.color).toBe('#92400E');
    expect(res.body.publicationDate).toBe(startAt);
    expect(res.body.startAt).toBe(startAt);

    const task = await request(app.getHttpServer())
      .get(`/tasks/${res.body.kanbanTaskId}`)
      .set(authHeader(ctx.admin.token))
      .expect(200);

    expect(task.body.status).toBe('falta_gravar');

    await request(app.getHttpServer())
      .delete(`/calendar/events/${res.body.id}`)
      .set(authHeader(ctx.admin.token))
      .expect(200);
  });

  it('POST /creation/deliverables — syncs kanban + calendar', async () => {
    const scheduledAt = new Date('2026-08-22T14:00:00.000Z').toISOString();

    const res = await request(app.getHttpServer())
      .post('/creation/deliverables')
      .set(authHeader(ctx.admin.token))
      .send({
        clientId: ctx.client.id,
        title: `E2E Deliverable ${E2E_RUN_ID}`,
        type: 'post_instagram',
        scheduledAt,
        status: 'draft',
      })
      .expect(201);

    expect(res.body.item.kanbanTaskId).toBeTruthy();
    expect(res.body.item.taskStatus).toBe('falta_gravar');

    const task = await request(app.getHttpServer())
      .get(`/tasks/${res.body.item.kanbanTaskId}`)
      .set(authHeader(ctx.admin.token))
      .expect(200);

    expect(task.body.status).toBe('falta_gravar');
    expect(task.body.statusColor).toBe('#92400E');
  });

  it('DELETE /kanban/tasks/:id — removes task', async () => {
    await request(app.getHttpServer())
      .delete(`/kanban/tasks/${createdTaskId}`)
      .set(authHeader(ctx.admin.token))
      .expect(200);

    createdTaskId = '';
  });
});
