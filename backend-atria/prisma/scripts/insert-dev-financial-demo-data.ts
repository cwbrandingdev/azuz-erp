/**
 * Inserts demo financial data for local/dev schema (chart, banks, lancamentos, OFX lines).
 * Not part of prisma db seed — run manually when the dev DB needs sample finance data.
 *
 * Usage: npx ts-node prisma/scripts/insert-dev-financial-demo-data.ts
 */
import {
  PrismaClient,
  RoleName,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { seedDefaultFinancialCategories } from '../../src/finance/finance-category-defaults';

const DEMO_MARKER = '[dev-demo]';
const DEFAULT_COMPANY_ID = '00000000-0000-4000-8000-000000000001';

const prisma = new PrismaClient();

function date(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

async function categoryIdByCode(companyId: string, code: string) {
  const row = await prisma.financialCategory.findFirst({
    where: { companyId, code },
    select: { id: true },
  });
  if (!row) {
    throw new Error(`Missing FinancialCategory code=${code} for company ${companyId}`);
  }
  return row.id;
}

async function main() {
  const company = await prisma.company.findUnique({
    where: { id: DEFAULT_COMPANY_ID },
    select: { id: true, name: true },
  });
  if (!company) {
    throw new Error(`Company ${DEFAULT_COMPANY_ID} not found in current schema.`);
  }

  const existingDemo = await prisma.financialTransaction.count({
    where: {
      companyId: company.id,
      description: { startsWith: DEMO_MARKER },
      deletedAt: null,
    },
  });
  if (existingDemo > 0) {
    console.log(
      `Skipping: ${existingDemo} demo transaction(s) already present (prefix "${DEMO_MARKER}").`,
    );
    return;
  }

  await seedDefaultFinancialCategories(prisma, company.id);

  const owner =
    (await prisma.user.findFirst({
      where: {
        companyId: company.id,
        isActive: true,
        role: { name: RoleName.MASTER },
        email: 'admin@atria.com',
      },
      select: { id: true, email: true },
    })) ??
    (await prisma.user.findFirst({
      where: {
        companyId: company.id,
        isActive: true,
        role: { name: { in: [RoleName.MASTER, RoleName.ADMIN] } },
      },
      select: { id: true, email: true },
    }));

  if (!owner) {
    throw new Error('No active MASTER/ADMIN user found to attach transactions.');
  }

  const clients = await prisma.client.findMany({
    where: { companyId: company.id },
    take: 4,
    select: { id: true, companyName: true },
    orderBy: { companyName: 'asc' },
  });

  const codes = [
    '1.1',
    '1.2',
    '1.3',
    '2.1',
    '3.1',
    '3.2',
    '4.1',
    '4.2',
    '4.9',
    '5.1',
    '5.2',
  ] as const;
  const categories: Record<(typeof codes)[number], string> = {} as Record<
    (typeof codes)[number],
    string
  >;
  for (const code of codes) {
    categories[code] = await categoryIdByCode(company.id, code);
  }

  const bankMain = await prisma.bankAccount.create({
    data: {
      companyId: company.id,
      name: 'Conta Corrente Bradesco',
      institution: 'Bradesco',
      initialBalance: 28500,
    },
  });
  const bankReserve = await prisma.bankAccount.create({
    data: {
      companyId: company.id,
      name: 'Reserva Nubank',
      institution: 'Nubank',
      initialBalance: 12000,
    },
  });

  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;

  type TxSeed = {
    description: string;
    amount: number;
    type: TransactionType;
    status: TransactionStatus;
    date: Date;
    dueDate?: Date;
    categoryCode: (typeof codes)[number];
    clientIndex?: number;
    bankAccountId?: string;
    title?: string;
  };

  const txSeeds: TxSeed[] = [
    {
      title: 'Retainer TechStart',
      description: `${DEMO_MARKER} Retainer mensal — TechStart`,
      amount: 18500,
      type: TransactionType.INCOME,
      status: TransactionStatus.PAID,
      date: date(y, m, 5),
      categoryCode: '1.2',
      clientIndex: 0,
      bankAccountId: bankMain.id,
    },
    {
      title: 'Projeto branding Jurix',
      description: `${DEMO_MARKER} Projeto branding — Jurix Capital`,
      amount: 42000,
      type: TransactionType.INCOME,
      status: TransactionStatus.PAID,
      date: date(y, m - 1, 18),
      categoryCode: '1.1',
      clientIndex: 3,
      bankAccountId: bankMain.id,
    },
    {
      title: 'Campanha performance OTI+',
      description: `${DEMO_MARKER} Campanha performance — OTI+`,
      amount: 9800,
      type: TransactionType.INCOME,
      status: TransactionStatus.PENDING,
      date: date(y, m, 10),
      dueDate: date(y, m, 28),
      categoryCode: '1.2',
      clientIndex: 2,
    },
    {
      title: 'Adiantamento CW Branding',
      description: `${DEMO_MARKER} Adiantamento contrato anual`,
      amount: 25000,
      type: TransactionType.INCOME,
      status: TransactionStatus.PAID,
      date: date(y, m - 2, 3),
      categoryCode: '1.3',
      clientIndex: 1,
      bankAccountId: bankReserve.id,
    },
    {
      description: `${DEMO_MARKER} Simples Nacional — competência anterior`,
      amount: 6200,
      type: TransactionType.EXPENSE,
      status: TransactionStatus.PAID,
      date: date(y, m, 8),
      categoryCode: '2.1',
      bankAccountId: bankMain.id,
    },
    {
      description: `${DEMO_MARKER} Freelancer motion — vídeo institucional`,
      amount: 3200,
      type: TransactionType.EXPENSE,
      status: TransactionStatus.PAID,
      date: date(y, m, 12),
      categoryCode: '3.1',
      bankAccountId: bankMain.id,
    },
    {
      description: `${DEMO_MARKER} Comissão parceiro indicação`,
      amount: 1800,
      type: TransactionType.EXPENSE,
      status: TransactionStatus.PENDING,
      date: date(y, m, 15),
      dueDate: date(y, m, 25),
      categoryCode: '3.2',
    },
    {
      description: `${DEMO_MARKER} Aluguel escritório`,
      amount: 4500,
      type: TransactionType.EXPENSE,
      status: TransactionStatus.PAID,
      date: date(y, m, 1),
      categoryCode: '4.1',
      bankAccountId: bankMain.id,
    },
    {
      description: `${DEMO_MARKER} Folha equipe criativa`,
      amount: 28600,
      type: TransactionType.EXPENSE,
      status: TransactionStatus.PAID,
      date: date(y, m, 5),
      categoryCode: '4.2',
      bankAccountId: bankMain.id,
    },
    {
      description: `${DEMO_MARKER} Assinaturas SaaS (Figma, Notion, Slack)`,
      amount: 890,
      type: TransactionType.EXPENSE,
      status: TransactionStatus.OVERDUE,
      date: date(y, m - 1, 20),
      dueDate: date(y, m - 1, 20),
      categoryCode: '4.9',
    },
    {
      description: `${DEMO_MARKER} Rendimento aplicação automática`,
      amount: 145.32,
      type: TransactionType.INCOME,
      status: TransactionStatus.PAID,
      date: date(y, m, 2),
      categoryCode: '5.1',
      bankAccountId: bankReserve.id,
    },
    {
      description: `${DEMO_MARKER} Tarifa TED e IOF`,
      amount: 42.5,
      type: TransactionType.EXPENSE,
      status: TransactionStatus.PAID,
      date: date(y, m, 6),
      categoryCode: '5.2',
      bankAccountId: bankMain.id,
    },
    {
      description: `${DEMO_MARKER} Receita serviços — trimestre anterior`,
      amount: 52000,
      type: TransactionType.INCOME,
      status: TransactionStatus.PAID,
      date: date(y, m - 1, 10),
      categoryCode: '1.2',
      bankAccountId: bankMain.id,
    },
    {
      description: `${DEMO_MARKER} Impostos trimestre anterior`,
      amount: 7800,
      type: TransactionType.EXPENSE,
      status: TransactionStatus.PAID,
      date: date(y, m - 1, 12),
      categoryCode: '2.1',
      bankAccountId: bankMain.id,
    },
    {
      description: `${DEMO_MARKER} Pro-labore sócios`,
      amount: 15000,
      type: TransactionType.EXPENSE,
      status: TransactionStatus.PAID,
      date: date(y, m - 2, 5),
      categoryCode: '4.2',
      bankAccountId: bankMain.id,
    },
  ];

  const createdTxIds: string[] = [];
  for (const seed of txSeeds) {
    const clientId =
      seed.clientIndex != null ? clients[seed.clientIndex]?.id : undefined;
    const tx = await prisma.financialTransaction.create({
      data: {
        companyId: company.id,
        userId: owner.id,
        description: seed.description,
        title: seed.title,
        amount: seed.amount,
        type: seed.type,
        status: seed.status,
        date: seed.date,
        dueDate: seed.dueDate,
        categoryId: categories[seed.categoryCode],
        clientId,
        bankAccountId: seed.bankAccountId,
      },
    });
    createdTxIds.push(tx.id);
  }

  await prisma.bankStatementLine.createMany({
    data: [
      {
        companyId: company.id,
        bankAccountId: bankMain.id,
        fitId: 'dev-demo-bradesco-001',
        postedAt: date(y, m, 5),
        amount: 18500,
        description: 'TED RETAINER TECHSTART',
        type: TransactionType.INCOME,
        transactionId: createdTxIds[0],
      },
      {
        companyId: company.id,
        bankAccountId: bankMain.id,
        fitId: 'dev-demo-bradesco-002',
        postedAt: date(y, m, 12),
        amount: 3200,
        description: 'PIX FREELANCER MOTION',
        type: TransactionType.EXPENSE,
        transactionId: createdTxIds[5],
      },
      {
        companyId: company.id,
        bankAccountId: bankMain.id,
        fitId: 'dev-demo-bradesco-unmatched',
        postedAt: date(y, m, 14),
        amount: 199.9,
        description: 'TARIFA PACOTE SERVICOS',
        type: TransactionType.EXPENSE,
      },
      {
        companyId: company.id,
        bankAccountId: bankReserve.id,
        fitId: 'dev-demo-nubank-001',
        postedAt: date(y, m, 2),
        amount: 145.32,
        description: 'RENDIMENTO RDB',
        type: TransactionType.INCOME,
        transactionId: createdTxIds[10],
      },
    ],
  });

  console.log(
    JSON.stringify(
      {
        company: company.name,
        owner: owner.email,
        categoriesSeeded: codes.length,
        bankAccounts: 2,
        transactions: txSeeds.length,
        statementLines: 4,
        clientsLinked: clients.map((c) => c.companyName),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
