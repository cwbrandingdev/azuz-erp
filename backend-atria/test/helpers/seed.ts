import * as bcrypt from 'bcrypt';
import { PrismaClient, RoleName, TransactionType, UserCategory } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../../src/company/company.constants';
import { DEFAULT_KANBAN_COLUMNS } from '../../src/kanban/kanban-defaults';
import {
  E2E_RUN_ID,
  TEST_ADMIN,
  TEST_CLIENT_USER,
  TEST_COMPANY_NAME,
  TEST_DESIGNER,
  TEST_DESIGNER_MASTER,
} from './constants';

type PrismaLike = Pick<
  PrismaClient,
  | 'user'
  | 'client'
  | 'role'
  | 'financialCategory'
  | 'kanbanColumn'
  | 'contentPost'
  | 'kanbanTask'
  | 'financialTransaction'
  | 'calendarEvent'
  | 'proposal'
  | 'contract'
  | 'clientPortalToken'
>;

export async function cleanupE2EData(prisma: PrismaLike, runId: string) {
  await prisma.contentPost.deleteMany({
    where: { title: { contains: runId } },
  });
  await prisma.kanbanTask.deleteMany({
    where: { title: { contains: runId } },
  });
  await prisma.calendarEvent.deleteMany({
    where: { title: { contains: runId } },
  });
  await prisma.proposal.deleteMany({
    where: { title: { contains: runId } },
  });
  await prisma.financialTransaction.deleteMany({
    where: { description: { contains: runId } },
  });
  await prisma.financialCategory.deleteMany({
    where: { name: { contains: runId } },
  });
  await prisma.contract.deleteMany({
    where: { title: { contains: runId } },
  });
  await prisma.clientPortalToken.deleteMany({
    where: { client: { companyName: { contains: runId } } },
  });
  await prisma.client.deleteMany({
    where: {
      companyName: { contains: runId },
    },
  });
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          TEST_ADMIN.email,
          TEST_CLIENT_USER.email,
          TEST_DESIGNER.email,
          TEST_DESIGNER_MASTER.email,
        ],
      },
    },
  });
}

export async function seedE2EData(prisma: PrismaLike) {
  await cleanupE2EData(prisma, E2E_RUN_ID);

  const passwordHash = await bcrypt.hash(TEST_ADMIN.password, 12);
  const clientPasswordHash = await bcrypt.hash(TEST_CLIENT_USER.password, 12);
  const designerPasswordHash = await bcrypt.hash(TEST_DESIGNER.password, 12);
  const designerMasterPasswordHash = await bcrypt.hash(
    TEST_DESIGNER_MASTER.password,
    12,
  );

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.ADMIN },
  });
  const clientRole = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.CLIENT },
  });
  const designerRole = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.DESIGNER_JUNIOR },
  });
  const designerMasterRole = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.DESIGNER_MASTER },
  });

  const client = await prisma.client.create({
    data: { companyName: TEST_COMPANY_NAME },
  });

  const otherClient = await prisma.client.create({
    data: { companyName: `Other ${TEST_COMPANY_NAME}` },
  });

  const adminUser = await prisma.user.create({
    data: {
      name: TEST_ADMIN.name,
      email: TEST_ADMIN.email,
      passwordHash,
      roleId: adminRole.id,
      category: UserCategory.MEMBER,
      mustChangePassword: false,
    },
  });

  const clientUser = await prisma.user.create({
    data: {
      name: TEST_CLIENT_USER.name,
      email: TEST_CLIENT_USER.email,
      passwordHash: clientPasswordHash,
      roleId: clientRole.id,
      category: UserCategory.CLIENT,
      clientId: client.id,
      mustChangePassword: false,
    },
  });

  const designerUser = await prisma.user.create({
    data: {
      name: TEST_DESIGNER.name,
      email: TEST_DESIGNER.email,
      passwordHash: designerPasswordHash,
      roleId: designerRole.id,
      category: UserCategory.MEMBER,
      mustChangePassword: false,
    },
  });

  const designerMasterUser = await prisma.user.create({
    data: {
      name: TEST_DESIGNER_MASTER.name,
      email: TEST_DESIGNER_MASTER.email,
      passwordHash: designerMasterPasswordHash,
      roleId: designerMasterRole.id,
      category: UserCategory.MEMBER,
      mustChangePassword: false,
    },
  });

  const incomeCategory = await prisma.financialCategory.upsert({
    where: {
      companyId_name_type: {
        companyId: DEFAULT_COMPANY_ID,
        name: `E2E Income ${E2E_RUN_ID}`,
        type: TransactionType.INCOME,
      },
    },
    update: {},
    create: {
      companyId: DEFAULT_COMPANY_ID,
      name: `E2E Income ${E2E_RUN_ID}`,
      type: TransactionType.INCOME,
      color: '#10B981',
    },
  });
  const expenseCategory = await prisma.financialCategory.upsert({
    where: {
      companyId_name_type: {
        companyId: DEFAULT_COMPANY_ID,
        name: `E2E Expense ${E2E_RUN_ID}`,
        type: TransactionType.EXPENSE,
      },
    },
    update: {},
    create: {
      companyId: DEFAULT_COMPANY_ID,
      name: `E2E Expense ${E2E_RUN_ID}`,
      type: TransactionType.EXPENSE,
      color: '#EF4444',
    },
  });

  let columns = await prisma.kanbanColumn.findMany({
    orderBy: { order: 'asc' },
    take: 5,
  });

  if (columns.length < 2) {
    for (const column of DEFAULT_KANBAN_COLUMNS) {
      await prisma.kanbanColumn.create({ data: column });
    }
    columns = await prisma.kanbanColumn.findMany({
      orderBy: { order: 'asc' },
      take: 5,
    });
  }

  if (columns.length < 2) {
    throw new Error('Kanban columns missing — unable to seed defaults');
  }

  return {
    adminUserId: adminUser.id,
    clientUserId: clientUser.id,
    designerUserId: designerUser.id,
    designerMasterUserId: designerMasterUser.id,
    clientId: client.id,
    otherClientId: otherClient.id,
    categoryIds: { income: incomeCategory.id, expense: expenseCategory.id },
    kanbanColumnIds: columns.map((column) => column.id),
  };
}
