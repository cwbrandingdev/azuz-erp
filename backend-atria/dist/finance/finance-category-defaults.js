"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FINANCIAL_CATEGORIES = exports.EXPENSE_CATEGORY_NAMES = void 0;
exports.syncFinancialCategories = syncFinancialCategories;
exports.seedDefaultFinancialCategories = seedDefaultFinancialCategories;
const client_1 = require("@prisma/client");
const CATEGORY_COLORS = [];
exports.EXPENSE_CATEGORY_NAMES = [];
const LEGACY_CATEGORY_NAMES = [];
exports.DEFAULT_FINANCIAL_CATEGORIES = [
    { name: 'RECEITAS', type: client_1.TransactionType.INCOME, color: '#10B981' },
    ...exports.EXPENSE_CATEGORY_NAMES.map((name, index) => ({
        name,
        type: client_1.TransactionType.EXPENSE,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    })),
];
const CHART_OF_ACCOUNTS = [
    node('1', 'Receitas', client_1.TransactionType.INCOME, client_1.DreGroup.GROSS_REVENUE, client_1.CashFlowBlock.OPERATIONAL, true, null),
    node('1.1', 'Receitas de Vendas', client_1.TransactionType.INCOME, client_1.DreGroup.GROSS_REVENUE, client_1.CashFlowBlock.OPERATIONAL, false, '1'),
    node('1.2', 'Receitas de Serviços', client_1.TransactionType.INCOME, client_1.DreGroup.GROSS_REVENUE, client_1.CashFlowBlock.OPERATIONAL, false, '1'),
    node('1.3', 'Outras Receitas', client_1.TransactionType.INCOME, client_1.DreGroup.GROSS_REVENUE, client_1.CashFlowBlock.OPERATIONAL, false, '1'),
    node('1.4', 'Adiantamentos', client_1.TransactionType.INCOME, client_1.DreGroup.GROSS_REVENUE, client_1.CashFlowBlock.OPERATIONAL, false, '1'),
    node('1.5', 'Empréstimos / Financiamentos', client_1.TransactionType.INCOME, client_1.DreGroup.FINANCIAL_RESULT, client_1.CashFlowBlock.FINANCIAL_MOVEMENTS, false, '1'),
    node('2', 'Dedução das Receitas', client_1.TransactionType.EXPENSE, client_1.DreGroup.DEDUCTION, client_1.CashFlowBlock.OPERATIONAL, true, null),
    node('2.1', 'Imposto sobre Vendas (Deduções)', client_1.TransactionType.EXPENSE, client_1.DreGroup.DEDUCTION, client_1.CashFlowBlock.OPERATIONAL, false, '2'),
    node('3', 'Custos Variáveis', client_1.TransactionType.EXPENSE, client_1.DreGroup.VARIABLE_COST, client_1.CashFlowBlock.OPERATIONAL, true, null),
    node('3.1', 'Custos de Produção', client_1.TransactionType.EXPENSE, client_1.DreGroup.VARIABLE_COST, client_1.CashFlowBlock.OPERATIONAL, false, '3'),
    node('3.2', 'Comissões', client_1.TransactionType.EXPENSE, client_1.DreGroup.VARIABLE_COST, client_1.CashFlowBlock.OPERATIONAL, false, '3'),
    node('4', 'Despesas Fixas', client_1.TransactionType.EXPENSE, client_1.DreGroup.FIXED_EXPENSE, client_1.CashFlowBlock.OPERATIONAL, true, null),
    node('4.1', 'Despesas Administrativas', client_1.TransactionType.EXPENSE, client_1.DreGroup.FIXED_EXPENSE, client_1.CashFlowBlock.OPERATIONAL, false, '4'),
    node('4.2', 'Salários', client_1.TransactionType.EXPENSE, client_1.DreGroup.FIXED_EXPENSE, client_1.CashFlowBlock.OPERATIONAL, false, '4'),
    node('4.9', 'Outras Despesas', client_1.TransactionType.EXPENSE, client_1.DreGroup.FIXED_EXPENSE, client_1.CashFlowBlock.OPERATIONAL, false, '4'),
    node('5', 'Resultado Financeiro', client_1.TransactionType.EXPENSE, client_1.DreGroup.FINANCIAL_RESULT, client_1.CashFlowBlock.FINANCIAL_MOVEMENTS, true, null),
    node('5.1', 'Receitas Financeiras', client_1.TransactionType.INCOME, client_1.DreGroup.FINANCIAL_RESULT, client_1.CashFlowBlock.FINANCIAL_MOVEMENTS, false, '5'),
    node('5.2', 'Despesas Financeiras', client_1.TransactionType.EXPENSE, client_1.DreGroup.FINANCIAL_RESULT, client_1.CashFlowBlock.FINANCIAL_MOVEMENTS, false, '5'),
    node('6', 'Distribuição de Lucro', client_1.TransactionType.EXPENSE, client_1.DreGroup.PROFIT_DISTRIBUTION, client_1.CashFlowBlock.FINANCIAL_MOVEMENTS, true, null),
    node('6.0', 'Distribuição de Lucros', client_1.TransactionType.EXPENSE, client_1.DreGroup.PROFIT_DISTRIBUTION, client_1.CashFlowBlock.FINANCIAL_MOVEMENTS, false, '6'),
    node('7', 'Transferências entre Contas Próprias', client_1.TransactionType.EXPENSE, client_1.DreGroup.TRANSFER, client_1.CashFlowBlock.OWN_ACCOUNT_TRANSFER, true, null),
    node('7.1', 'Transferência Recebida', client_1.TransactionType.INCOME, client_1.DreGroup.TRANSFER, client_1.CashFlowBlock.OWN_ACCOUNT_TRANSFER, false, '7'),
    node('7.2', 'Transferência Enviada', client_1.TransactionType.EXPENSE, client_1.DreGroup.TRANSFER, client_1.CashFlowBlock.OWN_ACCOUNT_TRANSFER, false, '7'),
];
function node(code, name, type, dreGroup, cashFlowBlock, isGroup, parentCode) {
    return {
        code,
        name,
        type,
        color: type === client_1.TransactionType.INCOME ? '#10B981' : '#EF4444',
        dreGroup,
        cashFlowBlock,
        isGroup,
        parentCode,
    };
}
function fold(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}
function classifyExisting(name, type) {
    const normalized = fold(name);
    if (/transfer/.test(normalized)) {
        return {
            parentCode: '7',
            dreGroup: client_1.DreGroup.TRANSFER,
            cashFlowBlock: client_1.CashFlowBlock.OWN_ACCOUNT_TRANSFER,
        };
    }
    if (/distribu|dividendo|\blucro\b/.test(normalized)) {
        return {
            parentCode: '6',
            dreGroup: client_1.DreGroup.PROFIT_DISTRIBUTION,
            cashFlowBlock: client_1.CashFlowBlock.FINANCIAL_MOVEMENTS,
        };
    }
    if (/imposto|deduc|\bdas\b|simples nacional|\biss\b|\bpis\b|cofins/.test(normalized)) {
        return {
            parentCode: '2',
            dreGroup: client_1.DreGroup.DEDUCTION,
            cashFlowBlock: client_1.CashFlowBlock.OPERATIONAL,
        };
    }
    if (/emprestimo|financiament/.test(normalized)) {
        return {
            parentCode: '5',
            dreGroup: client_1.DreGroup.FINANCIAL_RESULT,
            cashFlowBlock: client_1.CashFlowBlock.FINANCIAL_MOVEMENTS,
        };
    }
    if (/juros|tarifa|\biof\b|financeiro/.test(normalized)) {
        return {
            parentCode: '5',
            dreGroup: client_1.DreGroup.FINANCIAL_RESULT,
            cashFlowBlock: client_1.CashFlowBlock.FINANCIAL_MOVEMENTS,
        };
    }
    if (/comiss|custo|frete|insumo|variav/.test(normalized)) {
        return {
            parentCode: '3',
            dreGroup: client_1.DreGroup.VARIABLE_COST,
            cashFlowBlock: client_1.CashFlowBlock.OPERATIONAL,
        };
    }
    if (/salario|folha|pro-labore|prolabore|aluguel/.test(normalized)) {
        return {
            parentCode: '4',
            dreGroup: client_1.DreGroup.FIXED_EXPENSE,
            cashFlowBlock: client_1.CashFlowBlock.OPERATIONAL,
        };
    }
    if (/venda|retainer|contrato|projeto|receita|servico|fatur/.test(normalized)) {
        if (type === client_1.TransactionType.EXPENSE) {
            return {
                parentCode: '4.9',
                dreGroup: client_1.DreGroup.FIXED_EXPENSE,
                cashFlowBlock: client_1.CashFlowBlock.OPERATIONAL,
            };
        }
        return {
            parentCode: '1',
            dreGroup: client_1.DreGroup.GROSS_REVENUE,
            cashFlowBlock: client_1.CashFlowBlock.OPERATIONAL,
        };
    }
    if (type === client_1.TransactionType.INCOME) {
        return {
            parentCode: '1.3',
            dreGroup: client_1.DreGroup.GROSS_REVENUE,
            cashFlowBlock: client_1.CashFlowBlock.OPERATIONAL,
        };
    }
    return {
        parentCode: '4.9',
        dreGroup: client_1.DreGroup.FIXED_EXPENSE,
        cashFlowBlock: client_1.CashFlowBlock.OPERATIONAL,
    };
}
async function upsertChartNode(prisma, companyId, chartNode, parentId) {
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
        return collapsePrefixedDuplicate(prisma, companyId, chartNode, byCode.id, parentId);
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
async function collapsePrefixedDuplicate(prisma, companyId, chartNode, canonicalId, parentId) {
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
    if (!prefixed || chartNode.isGroup)
        return canonicalId;
    const canonicalTransactions = await prisma.financialTransaction.count({
        where: { categoryId: canonicalId },
    });
    if (canonicalTransactions > 0)
        return canonicalId;
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
        }
        catch {
        }
    }
    return prefixed.id;
}
async function syncFinancialCategories(prisma, companyId) {
    for (const category of exports.DEFAULT_FINANCIAL_CATEGORIES) {
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
    const idsByCode = new Map();
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
        for (const type of [client_1.TransactionType.INCOME, client_1.TransactionType.EXPENSE]) {
            const legacy = await prisma.financialCategory.findUnique({
                where: {
                    companyId_name_type: {
                        companyId,
                        name: legacyName,
                        type,
                    },
                },
            });
            if (!legacy)
                continue;
            const transactionCount = await prisma.financialTransaction.count({
                where: { categoryId: legacy.id },
            });
            if (transactionCount === 0) {
                try {
                    await prisma.financialCategory.delete({ where: { id: legacy.id } });
                }
                catch {
                }
            }
        }
    }
}
async function seedDefaultFinancialCategories(prisma, companyId) {
    await syncFinancialCategories(prisma, companyId);
}
//# sourceMappingURL=finance-category-defaults.js.map