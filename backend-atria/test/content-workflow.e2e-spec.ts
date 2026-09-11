import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { InternalReviewAction } from '../src/kanban/dto/internal-review.dto';
import { authHeader } from './helpers/bootstrap';
import { getE2E } from './helpers/globals';
import { E2E_RUN_ID } from './helpers/constants';

describe('Content workflow & Kanban (e2e)', () => {
  let app: INestApplication;
  let ctx: ReturnType<typeof getE2E>['ctx'];
  let postId: string;
  let taskId: string;

  beforeAll(() => {
    ({ app, ctx } = getE2E());
  });

  it('POST /content/posts — creates content post', async () => {
    const res = await request(app.getHttpServer())
      .post('/content/posts')
      .set(authHeader(ctx.designerMaster.token))
      .send({
        title: `E2E Post ${E2E_RUN_ID}`,
        clientId: ctx.client.id,
        platform: 'INSTAGRAM',
        copy: 'Automated test copy',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    postId = res.body.id;
  });

  it('POST /kanban/tasks — creates task linked to post', async () => {
    const [todoColumn] = ctx.kanbanColumnIds;

    const res = await request(app.getHttpServer())
      .post('/kanban/tasks')
      .set(authHeader(ctx.designerMaster.token))
      .send({
        title: `E2E Task ${E2E_RUN_ID}`,
        columnId: todoColumn,
        clientId: ctx.client.id,
        contentPostId: postId,
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    taskId = res.body.id;
  });

  it('PATCH /kanban/tasks/:id/move — moves task to next column', async () => {
    const [, inProgressColumn] = ctx.kanbanColumnIds;

    const res = await request(app.getHttpServer())
      .patch(`/kanban/tasks/${taskId}/move`)
      .set(authHeader(ctx.designerMaster.token))
      .send({ columnId: inProgressColumn, order: 0 })
      .expect(200);

    expect(res.body.columnId).toBe(inProgressColumn);
  });

  it('POST /kanban/tasks/:id/assets — uploads deliverable', async () => {
    const res = await request(app.getHttpServer())
      .post(`/kanban/tasks/${taskId}/assets`)
      .set(authHeader(ctx.designerMaster.token))
      .attach('file', Buffer.from('fake-image-content'), {
        filename: 'e2e-test.png',
        contentType: 'image/png',
      })
      .field('caption', 'E2E deliverable caption')
      .expect(201);

    expect(res.body.fileName).toBe('e2e-test.png');
    expect(res.body.caption).toBe('E2E deliverable caption');
  });

  it('PATCH /content/posts/:id/internal-review — internal approval', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/content/posts/${postId}/internal-review`)
      .set(authHeader(ctx.designerMaster.token))
      .send({ status: InternalReviewAction.APPROVED, note: 'E2E approved' })
      .expect(200);

    expect(res.body.internalReviewStatus).toBe('approved');
    expect(res.body.status).toBe('pending_approval');
  });

  it('PATCH /kanban/tasks/:id/internal-review — task internal approval', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/kanban/tasks/${taskId}/internal-review`)
      .set(authHeader(ctx.designerMaster.token))
      .send({ status: InternalReviewAction.APPROVED, note: 'E2E task approved' })
      .expect(200);

    expect(res.body.internalReviewStatus).toBe('approved');
  });

  it('PATCH /client-portal/posts/:id/approve — client approves post', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/client-portal/posts/${postId}/approve`)
      .set(authHeader(ctx.clientUser.token))
      .expect(200);

    expect(res.body.status).toBe('approved');
  });
});
