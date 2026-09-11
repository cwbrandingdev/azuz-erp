import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  E2E_RUN_ID,
  TEST_ADMIN,
  TEST_CLIENT_USER,
  TEST_COMPANY_NAME,
  TEST_DESIGNER,
  TEST_DESIGNER_MASTER,
} from './constants';
import { cleanupE2EData, seedE2EData } from './seed';

export interface E2ETestContext {
  runId: string;
  admin: { id: string; email: string; password: string; token: string };
  clientUser: {
    id: string;
    email: string;
    password: string;
    token: string;
    clientId: string;
  };
  designer: { id: string; email: string; password: string; token: string };
  designerMaster: { id: string; email: string; password: string; token: string };
  client: { id: string; companyName: string };
  otherClient: { id: string; companyName: string };
  categoryIds: { income: string; expense: string };
  kanbanColumnIds: string[];
}

async function login(
  application: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const res = await request(application.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return res.body.accessToken as string;
}

export async function bootstrapE2E(): Promise<{
  app: INestApplication;
  ctx: E2ETestContext;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const application = moduleFixture.createNestApplication();
  application.use(cookieParser());
  application.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  application.useGlobalFilters(new GlobalExceptionFilter());

  await application.init();

  const prisma = application.get(PrismaService);
  const seeded = await seedE2EData(prisma);

  const adminToken = await login(application, TEST_ADMIN.email, TEST_ADMIN.password);
  const clientToken = await login(
    application,
    TEST_CLIENT_USER.email,
    TEST_CLIENT_USER.password,
  );
  const designerToken = await login(
    application,
    TEST_DESIGNER.email,
    TEST_DESIGNER.password,
  );
  const designerMasterToken = await login(
    application,
    TEST_DESIGNER_MASTER.email,
    TEST_DESIGNER_MASTER.password,
  );

  const ctx: E2ETestContext = {
    runId: E2E_RUN_ID,
    admin: {
      id: seeded.adminUserId,
      email: TEST_ADMIN.email,
      password: TEST_ADMIN.password,
      token: adminToken,
    },
    clientUser: {
      id: seeded.clientUserId,
      email: TEST_CLIENT_USER.email,
      password: TEST_CLIENT_USER.password,
      token: clientToken,
      clientId: seeded.clientId,
    },
    designer: {
      id: seeded.designerUserId,
      email: TEST_DESIGNER.email,
      password: TEST_DESIGNER.password,
      token: designerToken,
    },
    designerMaster: {
      id: seeded.designerMasterUserId,
      email: TEST_DESIGNER_MASTER.email,
      password: TEST_DESIGNER_MASTER.password,
      token: designerMasterToken,
    },
    client: { id: seeded.clientId, companyName: TEST_COMPANY_NAME },
    otherClient: {
      id: seeded.otherClientId,
      companyName: `Other ${TEST_COMPANY_NAME}`,
    },
    categoryIds: seeded.categoryIds,
    kanbanColumnIds: seeded.kanbanColumnIds,
  };

  return { app: application, ctx };
}

export async function teardownE2E(): Promise<void> {
  const state = (
    globalThis as typeof globalThis & {
      __E2E__?: { app: INestApplication };
    }
  ).__E2E__;

  if (!state?.app) return;

  const prisma = state.app.get(PrismaService);
  await cleanupE2EData(prisma, E2E_RUN_ID);
  await state.app.close();
  (
    globalThis as typeof globalThis & { __E2E__?: unknown }
  ).__E2E__ = undefined;
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
