import {
  ContentPlatform,
  ContentPostFormat,
  ContentPostStatus,
  ContractStatus,
  EventCategory,
  KanbanTaskPriority,
  KanbanTaskStatus,
  ProductionPhase,
  PaymentFrequency,
  PrismaClient,
  RoleName,
  TransactionType,
  UserCategory,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ROLE_PERMISSIONS } from '../src/auth/constants/permissions';
import {
  DEFAULT_FINANCIAL_CATEGORIES,
  seedDefaultFinancialCategories,
} from '../src/finance/finance-category-defaults';
import { DEFAULT_KANBAN_COLUMNS } from '../src/kanban/kanban-defaults';
import {
  LEAD_KANBAN_STATUSES,
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
} from '../src/leads/lead-kanban.constants';
import { seedDevTenant } from '../src/tenancy/infrastructure/dev-tenant-seed';

const prisma = new PrismaClient();

async function seedMasterUser(companyId: string) {
  const email = process.env.SEED_MASTER_EMAIL?.trim();
  const password = process.env.SEED_MASTER_PASSWORD;

  if (!email || !password) {
    console.warn(
      'Skipping master user seed: set SEED_MASTER_EMAIL and SEED_MASTER_PASSWORD in .env (local only, never commit).',
    );
    return null;
  }

  const masterRole = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.MASTER },
  });
  const passwordHash = await bcrypt.hash(password, 12);
  const name = process.env.SEED_MASTER_NAME?.trim() || 'Admin';

  const user = await prisma.user.upsert({
    where: {
      companyId_email: {
        companyId,
        email,
      },
    },
    update: {
      name,
      passwordHash,
      roleId: masterRole.id,
      category: UserCategory.MEMBER,
      mustChangePassword: false,
      isActive: true,
    },
    create: {
      companyId,
      email,
      name,
      passwordHash,
      roleId: masterRole.id,
      category: UserCategory.MEMBER,
      mustChangePassword: false,
      isActive: true,
    },
  });

  console.log(`Seeded master user: ${email}`);
  return user;
}

const ROLE_DEFINITIONS: Array<{ name: RoleName; description: string }> = [
  { name: RoleName.MASTER, description: 'Full unrestricted system access' },
  { name: RoleName.ADMIN, description: 'Full operational access' },
  {
    name: RoleName.DESIGNER_MASTER,
    description: 'Edit all Kanban tasks and Calendar across users',
  },
  {
    name: RoleName.DESIGNER_JUNIOR,
    description: 'Edit only assigned Kanban tasks and Calendar items',
  },
  {
    name: RoleName.CRM,
    description: 'Full access to Prospecting and Lead Kanban across organizations',
  },
  {
    name: RoleName.EXTERNAL_CLIENT_CRM,
    description: 'Access to own organization Lead Kanban only',
  },
  {
    name: RoleName.CLIENT,
    description: 'Client portal access scoped to own company deliverables',
  },
];

async function main() {
  const { tenant } = await seedDevTenant(prisma);

  const company = await prisma.company.upsert({
    where: { subdomain: 'default' },
    update: { name: 'Atria', status: 'ACTIVE', tenantId: tenant.id },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Atria',
      subdomain: 'default',
      status: 'ACTIVE',
      tenantId: tenant.id,
    },
  });

  for (const role of ROLE_DEFINITIONS) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        description: role.description,
        permissions: ROLE_PERMISSIONS[role.name],
      },
      create: {
        name: role.name,
        description: role.description,
        permissions: ROLE_PERMISSIONS[role.name],
      },
    });
  }

  const companies = await prisma.company.findMany({ select: { id: true } });
  for (const existingCompany of companies) {
    await seedDefaultFinancialCategories(prisma, existingCompany.id);
    await seedDefaultLeadStages(prisma, existingCompany.id);
  }

  for (const category of DEFAULT_FINANCIAL_CATEGORIES) {
    await prisma.financialCategory.upsert({
      where: {
        companyId_name_type: {
          companyId: company.id,
          name: category.name,
          type: category.type,
        },
      },
      update: { color: category.color },
      create: { ...category, companyId: company.id },
    });
  }

  const admin = await seedMasterUser(company.id);

  if (!admin) {
    console.log('Seeded roles and financial categories (no sample data — master user not configured)');
    return;
  }

  const existingCount = await prisma.financialTransaction.count({
    where: { userId: admin.id },
  });

  if (existingCount === 0) {
      const incomeCategories = await prisma.financialCategory.findMany({
        where: { type: TransactionType.INCOME, companyId: company.id },
      });
      const expenseCategories = await prisma.financialCategory.findMany({
        where: { type: TransactionType.EXPENSE, companyId: company.id },
      });

      const now = new Date();
      const incomeCategoryId = incomeCategories[0]?.id;
      const expenseCategoryIds = expenseCategories.map((category) => category.id);

      if (!incomeCategoryId || expenseCategoryIds.length === 0) {
        console.warn(
          'Skipping sample financial transactions: no default expense categories configured.',
        );
      } else {
      const sampleTransactions = [
        {
          description: 'Projeto Branding — Cliente A',
          amount: 12500,
          type: TransactionType.INCOME,
          status: 'PAID' as const,
          date: new Date(now.getFullYear(), now.getMonth(), 20),
          categoryId: incomeCategoryId,
        },
        {
          description: 'Assinatura Adobe Creative Cloud',
          amount: 890,
          type: TransactionType.EXPENSE,
          status: 'PAID' as const,
          date: new Date(now.getFullYear(), now.getMonth(), 18),
          categoryId: expenseCategoryIds[0],
        },
        {
          description: 'Campanha Social Media — Cliente B',
          amount: 8200,
          type: TransactionType.INCOME,
          status: 'PAID' as const,
          date: new Date(now.getFullYear(), now.getMonth(), 15),
          categoryId: incomeCategoryId,
        },
        {
          description: 'Freelancer — Edição de vídeo',
          amount: 2400,
          type: TransactionType.EXPENSE,
          status: 'PENDING' as const,
          date: new Date(now.getFullYear(), now.getMonth(), 12),
          categoryId: expenseCategoryIds[1] ?? expenseCategoryIds[0],
        },
        {
          description: 'Retainer Mensal — Cliente C',
          amount: 15000,
          type: TransactionType.INCOME,
          status: 'PAID' as const,
          date: new Date(now.getFullYear(), now.getMonth(), 1),
          categoryId: incomeCategoryId,
        },
        {
          description: 'Anúncios Google Ads',
          amount: 1500,
          type: TransactionType.EXPENSE,
          status: 'OVERDUE' as const,
          date: new Date(now.getFullYear(), now.getMonth() - 1, 28),
          categoryId: expenseCategoryIds[2] ?? expenseCategoryIds[0],
        },
      ];

      for (const tx of sampleTransactions) {
        await prisma.financialTransaction.create({
          data: { ...tx, userId: admin.id },
        });
      }

      console.log(`Seeded ${sampleTransactions.length} sample transactions`);
      }
    }

    const eventCount = await prisma.calendarEvent.count();
    if (eventCount === 0) {
      const now = new Date();
      const events = [
        {
          title: 'Alinhamento com Design',
          description: 'Revisão de layouts e identidade visual',
          startAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0),
          endAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0),
          category: EventCategory.MEETING,
          isPending: false,
          createdById: admin.id,
          assigneeId: admin.id,
        },
        {
          title: 'Deadline — Campanha Social',
          description: 'Entrega final dos criativos',
          startAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 9, 0),
          endAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 18, 0),
          category: EventCategory.DEADLINE,
          isPending: true,
          createdById: admin.id,
        },
        {
          title: 'Publicação Instagram',
          startAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 10, 0),
          endAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 10, 30),
          category: EventCategory.PUBLISH,
          isPending: true,
          createdById: admin.id,
          assigneeId: admin.id,
        },
      ];

      for (const event of events) {
        await prisma.calendarEvent.create({ data: event });
      }
      console.log(`Seeded ${events.length} calendar events`);
    }

    const columnCount = await prisma.kanbanColumn.count();
    if (columnCount === 0) {
      const columns = await Promise.all(
        DEFAULT_KANBAN_COLUMNS.map((column) =>
          prisma.kanbanColumn.create({ data: { ...column } }),
        ),
      );

      const producao = columns.find(
        (column) => column.statusKey === KanbanTaskStatus.PRODUCAO,
      )!;
      const faltaGravar = columns.find(
        (column) => column.statusKey === KanbanTaskStatus.FALTA_GRAVAR,
      )!;
      const ok = columns.find(
        (column) => column.statusKey === KanbanTaskStatus.OK,
      )!;

      const tasks = [
        {
          title: 'Briefing Cliente X',
          description: 'Revisar documento de briefing',
          columnId: producao.id,
          status: KanbanTaskStatus.PRODUCAO,
          priority: KanbanTaskPriority.CRITICAL,
          order: 0,
          createdById: admin.id,
        },
        {
          title: 'Roteiro Reels',
          description: 'Criar roteiro para campanha de verão',
          columnId: producao.id,
          status: KanbanTaskStatus.PRODUCAO,
          priority: KanbanTaskPriority.PLANNED,
          order: 1,
          createdById: admin.id,
        },
        {
          title: 'Design Post Instagram',
          columnId: faltaGravar.id,
          status: KanbanTaskStatus.FALTA_GRAVAR,
          productionPhase: ProductionPhase.ROTEIRO,
          priority: KanbanTaskPriority.MEDIUM,
          order: 0,
          createdById: admin.id,
          assigneeIds: [admin.id],
        },
        {
          title: 'Vídeo TikTok',
          description: 'Aguardando aprovação do cliente',
          columnId: faltaGravar.id,
          status: KanbanTaskStatus.FALTA_GRAVAR,
          productionPhase: ProductionPhase.EM_GRAVACAO,
          priority: KanbanTaskPriority.HIGH,
          order: 1,
          createdById: admin.id,
        },
        {
          title: 'Calendário Editorial',
          columnId: ok.id,
          status: KanbanTaskStatus.OK,
          priority: KanbanTaskPriority.LOW,
          order: 0,
          createdById: admin.id,
          assigneeIds: [admin.id],
        },
      ];

      for (const task of tasks) {
        const { assigneeIds, ...taskData } = task;
        const created = await prisma.kanbanTask.create({
          data: {
            ...taskData,
            assignees: assigneeIds?.length
              ? { create: assigneeIds.map((userId) => ({ userId })) }
              : undefined,
          },
        });

        await prisma.taskHistory.create({
          data: {
            taskId: created.id,
            userId: admin.id,
            action: 'Tarefa criada',
          },
        });
      }

      console.log(`Seeded ${columns.length} kanban columns and ${tasks.length} tasks`);
    }

    const clientCount = await prisma.client.count();
    if (clientCount === 0) {
      const clients = [
        {
          companyName: 'Moda Verão Ltda',
          contactName: 'Ana Silva',
          email: 'contato@modaverao.com.br',
          phone: '(11) 98765-4321',
          instagram: '@modaverao',
          website: 'https://modaverao.com.br',
          street: 'Rua das Flores',
          number: '120',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
          notes: 'Cliente premium — foco em Instagram e TikTok.',
        },
        {
          companyName: 'TechStart Inovação',
          contactName: 'Carlos Mendes',
          email: 'marketing@techstart.io',
          phone: '(21) 99876-5432',
          instagram: '@techstart.io',
          website: 'https://techstart.io',
          street: 'Av. Paulista',
          number: '1500',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-200',
        },
        {
          companyName: 'Boutique Elegance',
          contactName: 'Mariana Costa',
          email: 'hello@boutiqueelegance.com',
          phone: '(31) 97654-3210',
          instagram: '@boutiqueelegance',
          city: 'Belo Horizonte',
          state: 'MG',
        },
      ];

      for (const client of clients) {
        await prisma.client.create({ data: client });
      }
      console.log(`Seeded ${clients.length} clients`);
    }

    const postCount = await prisma.contentPost.count();
    if (postCount === 0) {
      const clients = await prisma.client.findMany({ take: 3 });
      const [moda, tech, boutique] = clients;
      const now = new Date();
      const posts = [
        {
          title: 'Reels — Lançamento Produto Verão',
          platform: ContentPlatform.INSTAGRAM,
          format: ContentPostFormat.REELS,
          scheduledDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 18, 0),
          status: ContentPostStatus.SCHEDULED,
          copy: 'Confira o novo lançamento da coleção verão! ☀️ #moda #verao',
          userId: admin.id,
          clientId: moda?.id,
        },
        {
          title: 'Tutorial TikTok — Behind the Scenes',
          platform: ContentPlatform.TIKTOK,
          format: ContentPostFormat.REELS,
          status: ContentPostStatus.DRAFT,
          copy: 'Rascunho do roteiro para vídeo behind the scenes da produção.',
          userId: admin.id,
          clientId: tech?.id,
        },
        {
          title: 'Vídeo YouTube — Case de Sucesso',
          platform: ContentPlatform.YOUTUBE,
          format: ContentPostFormat.STATIC,
          scheduledDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 12, 0),
          status: ContentPostStatus.PENDING_APPROVAL,
          copy: 'Case completo do cliente X com resultados do Q2.',
          userId: admin.id,
          clientId: tech?.id,
        },
        {
          title: 'Post LinkedIn — Insights de Marketing',
          platform: ContentPlatform.LINKEDIN,
          format: ContentPostFormat.STATIC,
          scheduledDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3, 9, 0),
          status: ContentPostStatus.PUBLISHED,
          copy: '5 tendências de marketing digital para 2026.',
          userId: admin.id,
          clientId: boutique?.id,
        },
        {
          title: 'Carrossel Instagram — Dicas de Branding',
          platform: ContentPlatform.INSTAGRAM,
          format: ContentPostFormat.CAROUSEL,
          status: ContentPostStatus.DRAFT,
          copy: 'Rascunho do carrossel com 7 dicas de branding para PMEs.',
          userId: admin.id,
          clientId: moda?.id,
        },
      ].filter((p) => p.clientId);

      for (const post of posts) {
        await prisma.contentPost.create({ data: post });
      }
      console.log(`Seeded ${posts.length} content posts`);
    }

    const contractCount = await prisma.contract.count();
    if (contractCount === 0) {
      const clients = await prisma.client.findMany({ take: 2 });
      if (clients.length > 0) {
        const terms = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

As partes acordam os termos de prestação de serviços de marketing digital, incluindo gestão de redes sociais, produção de conteúdo e relatórios mensais de performance.

O pagamento será realizado conforme a frequência acordada neste contrato.`;

        await prisma.contract.create({
          data: {
            clientId: clients[0].id,
            title: 'Contrato de Marketing Digital — Retainer Mensal',
            status: ContractStatus.SENT,
            recurringValue: 4500,
            paymentFrequency: PaymentFrequency.MONTHLY,
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 11)),
            termsContent: terms,
            createdById: admin.id,
          },
        });

        await prisma.contract.create({
          data: {
            clientId: clients[1]?.id ?? clients[0].id,
            title: 'Projeto Pontual — Campanha de Lançamento',
            status: ContractStatus.DRAFT,
            recurringValue: 12000,
            paymentFrequency: PaymentFrequency.ONE_TIME,
            startDate: new Date(),
            termsContent: terms,
            createdById: admin.id,
          },
        });

        console.log('Seeded sample contracts');
      }
    }

  console.log('Seeded roles and financial categories');
}

async function seedDefaultLeadStages(
  client: PrismaClient,
  companyId: string,
) {
  const count = await client.leadStage.count({ where: { companyId } });
  if (count > 0) {
    return;
  }

  await client.leadStage.createMany({
    data: LEAD_KANBAN_STATUSES.map((status, order) => ({
      companyId,
      name: LEAD_STATUS_LABELS[status],
      color: LEAD_STATUS_COLORS[status],
      key: status,
      order,
    })),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
