import {
  CashFlowBlock,
  DreGroup,
  Prisma,
  PrismaClient,
  TransactionType,
} from '@prisma/client';

const CATEGORY_COLORS = [] as const;

export const EXPENSE_CATEGORY_NAMES = [] as const;

const LEGACY_CATEGORY_NAMES = [] as const;

export const DEFAULT_FINANCIAL_CATEGORIES = [
  { name: 'RECEITAS', type: TransactionType.INCOME, color: '#10B981' },
  ...EXPENSE_CATEGORY_NAMES.map((name, index) => ({
    name,
    type: TransactionType.EXPENSE,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  })),
] as const;

type FinanceDb = PrismaClient | Prisma.TransactionClient;

type ChartNode = {
  code: string;
  name: string;
  type: TransactionType;
  color: string;
  dreGroup: DreGroup;
  cashFlowBlock: CashFlowBlock;
  isGroup: boolean;
  parentCode: string | null;
};

const CHART_OF_ACCOUNTS: ChartNode[] = [
  node('1', 'Receitas', TransactionType.INCOME, DreGroup.GROSS_REVENUE, CashFlowBlock.OPERATIONAL, true, null),
  node('1.1', 'Receitas de Vendas', TransactionType.INCOME, DreGroup.GROSS_REVENUE, CashFlowBlock.OPERATIONAL, false, '1'),
  node('1.2', 'Receitas de Serviços', TransactionType.INCOME, DreGroup.GROSS_REVENUE, CashFlowBlock.OPERATIONAL, false, '1'),
  node('1.3', 'Outras Receitas', TransactionType.INCOME, DreGroup.GROSS_REVENUE, CashFlowBlock.OPERATIONAL, false, '1'),
  node('1.4', 'Adiantamentos', TransactionType.INCOME, DreGroup.GROSS_REVENUE, CashFlowBlock.OPERATIONAL, false, '1'),
  node('1.5', 'Empréstimos / Financiamentos', TransactionType.INCOME, DreGroup.FINANCIAL_RESULT, CashFlowBlock.FINANCIAL_MOVEMENTS, false, '1'),
  node('2', 'Dedução das Receitas', TransactionType.EXPENSE, DreGroup.DEDUCTION, CashFlowBlock.OPERATIONAL, true, null),
  node('2.1', 'Imposto sobre Vendas (Deduções)', TransactionType.EXPENSE, DreGroup.DEDUCTION, CashFlowBlock.OPERATIONAL, false, '2'),
  node('3', 'Custos Variáveis', TransactionType.EXPENSE, DreGroup.VARIABLE_COST, CashFlowBlock.OPERATIONAL, true, null),
  node('3.1', 'Custos de Produção', TransactionType.EXPENSE, DreGroup.VARIABLE_COST, CashFlowBlock.OPERATIONAL, false, '3'),
  node('3.2', 'Comissões', TransactionType.EXPENSE, DreGroup.VARIABLE_COST, CashFlowBlock.OPERATIONAL, false, '3'),
  node('4', 'Despesas Fixas', TransactionType.EXPENSE, DreGroup.FIXED_EXPENSE, CashFlowBlock.OPERATIONAL, true, null),
  node('4.1', 'Despesas Administrativas', TransactionType.EXPENSE, DreGroup.FIXED_EXPENSE, CashFlowBlock.OPERATIONAL, false, '4'),
  node('4.2', 'Salários', TransactionType.EXPENSE, DreGroup.FIXED_EXPENSE, CashFlowBlock.OPERATIONAL, false, '4'),
  node('4.9', 'Outras Despesas', TransactionType.EXPENSE, DreGroup.FIXED_EXPENSE, CashFlowBlock.OPERATIONAL, false, '4'),
  node('5', 'Resultado Financeiro', TransactionType.EXPENSE, DreGroup.FINANCIAL_RESULT, CashFlowBlock.FINANCIAL_MOVEMENTS, true, null),
  node('5.1', 'Receitas Financeiras', TransactionType.INCOME, DreGroup.FINANCIAL_RESULT, CashFlowBlock.FINANCIAL_MOVEMENTS, false, '5'),
  node('5.2', 'Despesas Financeiras', TransactionType.EXPENSE, DreGroup.FINANCIAL_RESULT, CashFlowBlock.FINANCIAL_MOVEMENTS, false, '5'),
  node('6', 'Distribuição de Lucro', TransactionType.EXPENSE, DreGroup.PROFIT_DISTRIBUTION, CashFlowBlock.FINANCIAL_MOVEMENTS, true, null),
  node('6.0', 'Distribuição de Lucros', TransactionType.EXPENSE, DreGroup.PROFIT_DISTRIBUTION, CashFlowBlock.FINANCIAL_MOVEMENTS, false, '6'),
  node('7', 'Transferências entre Contas Próprias', TransactionType.EXPENSE, DreGroup.TRANSFER, CashFlowBlock.OWN_ACCOUNT_TRANSFER, true, null),
  node('7.1', 'Transferência Recebida', TransactionType.INCOME, DreGroup.TRANSFER, CashFlowBlock.OWN_ACCOUNT_TRANSFER, false, '7'),
  node('7.2', 'Transferência Enviada', TransactionType.EXPENSE, DreGroup.TRANSFER, CashFlowBlock.OWN_ACCOUNT_TRANSFER, false, '7'),
];

function node(
  code: string,
  name: string,
  type: TransactionType,
  dreGroup: DreGroup,
  cashFlowBlock: CashFlowBlock,
  isGroup: boolean,
  parentCode: string | null,
): ChartNode {
  return {
    code,
    name,
    type,
    color: type === TransactionType.INCOME ? '#10B981' : '#EF4444',
    dreGroup,
    cashFlowBlock,
    isGroup,
    parentCode,
  };
}

function fold(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function classifyExisting(name: string, type: TransactionType) {
  const normalized = fold(name);

  if (/transfer/.test(normalized)) {
    return {
      parentCode: '7',
      dreGroup: DreGroup.TRANSFER,
      cashFlowBlock: CashFlowBlock.OWN_ACCOUNT_TRANSFER,
    };
  }

  if (/distribu|dividendo|\blucro\b/.test(normalized)) {
    return {
      parentCode: '6',
      dreGroup: DreGroup.PROFIT_DISTRIBUTION,
      cashFlowBlock: CashFlowBlock.FINANCIAL_MOVEMENTS,
    };
  }

  if (/imposto|deduc|\bdas\b|simples nacional|\biss\b|\bpis\b|cofins/.test(normalized)) {
    return {
      parentCode: '2',
      dreGroup: DreGroup.DEDUCTION,
      cashFlowBlock: CashFlowBlock.OPERATIONAL,
    };
  }

  if (/emprestimo|financiament/.test(normalized)) {
    return {
      parentCode: '5',
      dreGroup: DreGroup.FINANCIAL_RESULT,
      cashFlowBlock: CashFlowBlock.FINANCIAL_MOVEMENTS,
    };
  }

  if (/juros|tarifa|\biof\b|financeiro/.test(normalized)) {
    return {
      parentCode: '5',
      dreGroup: DreGroup.FINANCIAL_RESULT,
      cashFlowBlock: CashFlowBlock.FINANCIAL_MOVEMENTS,
    };
  }

  if (/comiss|custo|frete|insumo|variav/.test(normalized)) {
    return {
      parentCode: '3',
      dreGroup: DreGroup.VARIABLE_COST,
      cashFlowBlock: CashFlowBlock.OPERATIONAL,
    };
  }

  if (/salario|folha|pro-labore|prolabore|aluguel/.test(normalized)) {
    return {
      parentCode: '4',
      dreGroup: DreGroup.FIXED_EXPENSE,
      cashFlowBlock: CashFlowBlock.OPERATIONAL,
    };
  }

  if (/venda|retainer|contrato|projeto|receita|servico|fatur/.test(normalized)) {
    if (type === TransactionType.EXPENSE) {
      return {
        parentCode: '4.9',
        dreGroup: DreGroup.FIXED_EXPENSE,
        cashFlowBlock: CashFlowBlock.OPERATIONAL,
      };
    }

    return {
      parentCode: '1',
      dreGroup: DreGroup.GROSS_REVENUE,
      cashFlowBlock: CashFlowBlock.OPERATIONAL,
    };
  }

  if (type === TransactionType.INCOME) {
    return {
      parentCode: '1.3',
      dreGroup: DreGroup.GROSS_REVENUE,
      cashFlowBlock: CashFlowBlock.OPERATIONAL,
    };
  }

  return {
    parentCode: '4.9',
    dreGroup: DreGroup.FIXED_EXPENSE,
    cashFlowBlock: CashFlowBlock.OPERATIONAL,
  };
}

async function upsertChartNode(
  prisma: FinanceDb,
  companyId: string,
  chartNode: ChartNode,
  parentId: string | null,
) {
  const byCode = await prisma.financialCategory.findFirst({
    where: { companyId, code: chartNode.code },
  });

  if (byCode) {
    await prisma.financialCategory.update({
      where: { id: byCode.id },
      data: {
        parentId,
        dreGroup: chartNode.dreGroup,
        cashFlowBlock: chartNode.cashFlowBlock,
        isGroup: chartNode.isGroup,
      },
    });
    return collapsePrefixedDuplicate(
      prisma,
      companyId,
      chartNode,
      byCode.id,
      parentId,
    );
  }

  const byName = await prisma.financialCategory.findFirst({
    where: {
      companyId,
      name: chartNode.name,
      type: chartNode.type,
    },
  });

  if (byName && !byName.code) {
    await prisma.financialCategory.update({
      where: { id: byName.id },
      data: {
        code: chartNode.code,
        parentId,
        dreGroup: chartNode.dreGroup,
        cashFlowBlock: chartNode.cashFlowBlock,
        isGroup: chartNode.isGroup,
      },
    });
    return collapsePrefixedDuplicate(prisma, companyId, chartNode, byName.id, parentId);
  }

  if (byName) {
    return collapsePrefixedDuplicate(prisma, companyId, chartNode, byName.id, parentId);
  }

  const created = await prisma.financialCategory.create({
    data: {
      companyId,
      name: chartNode.name,
      type: chartNode.type,
      color: chartNode.color,
      code: chartNode.code,
      parentId,
      dreGroup: chartNode.dreGroup,
      cashFlowBlock: chartNode.cashFlowBlock,
      isGroup: chartNode.isGroup,
    },
  });

  return collapsePrefixedDuplicate(prisma, companyId, chartNode, created.id, parentId);
}

async function collapsePrefixedDuplicate(
  prisma: FinanceDb,
  companyId: string,
  chartNode: ChartNode,
  canonicalId: string,
  parentId: string | null,
) {
  const prefixed = await prisma.financialCategory.findFirst({
    where: {
      companyId,
      type: chartNode.type,
      id: { not: canonicalId },
      name: {
        equals: `${chartNode.code} ${chartNode.name}`,
        mode: 'insensitive',
      },
    },
  });

  if (!prefixed || chartNode.isGroup) return canonicalId;

  const canonicalTransactions = await prisma.financialTransaction.count({
    where: { categoryId: canonicalId },
  });

  if (canonicalTransactions > 0) return canonicalId;

  await prisma.financialCategory.update({
    where: { id: canonicalId },
    data: { code: null },
  });

  await prisma.financialCategory.update({
    where: { id: prefixed.id },
    data: {
      code: chartNode.code,
      parentId,
      dreGroup: chartNode.dreGroup,
      cashFlowBlock: chartNode.cashFlowBlock,
      isGroup: chartNode.isGroup,
    },
  });

  await prisma.financialCategory.updateMany({
    where: { parentId: canonicalId },
    data: { parentId: prefixed.id },
  });

  const stillReferenced = await prisma.financialTransaction.count({
    where: { categoryId: canonicalId },
  });

  if (stillReferenced === 0) {
    try {
      await prisma.financialCategory.delete({ where: { id: canonicalId } });
    } catch {
      // Keep the empty row if something else still points at it.
    }
  }

  return prefixed.id;
}

export async function syncFinancialCategories(
  prisma: FinanceDb,
  companyId: string,
): Promise<void> {
  for (const category of DEFAULT_FINANCIAL_CATEGORIES) {
    await prisma.financialCategory.upsert({
      where: {
        companyId_name_type: {
          companyId,
          name: category.name,
          type: category.type,
        },
      },
      update: { color: category.color },
      create: {
        companyId,
        name: category.name,
        type: category.type,
        color: category.color,
      },
    });
  }

  const idsByCode = new Map<string, string>();

  for (const chartNode of CHART_OF_ACCOUNTS) {
    const parentId = chartNode.parentCode
      ? (idsByCode.get(chartNode.parentCode) ?? null)
      : null;
    const id = await upsertChartNode(prisma, companyId, chartNode, parentId);
    idsByCode.set(chartNode.code, id);
  }

  const unclassified = await prisma.financialCategory.findMany({
    where: {
      companyId,
      code: null,
      dreGroup: null,
    },
  });

  for (const category of unclassified) {
    const classification = classifyExisting(category.name, category.type);
    const parentId = idsByCode.get(classification.parentCode) ?? null;

    await prisma.financialCategory.update({
      where: { id: category.id },
      data: {
        parentId,
        dreGroup: classification.dreGroup,
        cashFlowBlock: classification.cashFlowBlock,
      },
    });
  }

  for (const legacyName of LEGACY_CATEGORY_NAMES) {
    for (const type of [TransactionType.INCOME, TransactionType.EXPENSE]) {
      const legacy = await prisma.financialCategory.findUnique({
        where: {
          companyId_name_type: {
            companyId,
            name: legacyName,
            type,
          },
        },
      });

      if (!legacy) continue;

      const transactionCount = await prisma.financialTransaction.count({
        where: { categoryId: legacy.id },
      });

      if (transactionCount === 0) {
        try {
          await prisma.financialCategory.delete({ where: { id: legacy.id } });
        } catch {
          // Category may still be referenced by soft-deleted transactions.
        }
      }
    }
  }
}

export async function seedDefaultFinancialCategories(
  prisma: FinanceDb,
  companyId: string,
): Promise<void> {
  await syncFinancialCategories(prisma, companyId);
}
