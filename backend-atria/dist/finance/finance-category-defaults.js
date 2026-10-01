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
const SIMPOOW_INCOME = [
    '1.1 Receitas de Vendas',
    '1.2 Receitas de Serviços',
    '1.3 Outras Receitas',
    '1.4 Adiantamentos',
    '1.5 Empréstimos / Financiamentos',
    '1.6 Mútuos',
    '1.7 Rendimentos Financeiros',
    '1.8 Estorno de Despesas',
    '1.9 Antecipação de Recebíveis',
    '1.10 Transferência entre Contas',
    '1.11 Aporte de Sócios',
    '1.12 Recursos de clientes',
];
const SIMPOOW_EXPENSE = [
    '2.1 Imposto sobre Vendas (Deduções)',
    '2.2 Devoluções ou Cancelamentos (Deduções)',
    '3.1 Matéria Prima / Insumos - CMV',
    '3.2 Embalagens',
    '3.3 Transportes e Fretes',
    '3.4 Comissões',
    '3.5 Combustível',
    '3.6 Mão de Obra Direta',
    '3.7 Aplicativos',
    '3.8 Outros Custos Variáveis',
    '3.9 Gás',
    '3.10 Bonificações sobre Vendas',
    '3.11 CBS',
    '3.12 IBS',
    '3.13 Imposto Seletivo (IS)',
    '3.14 Locação de Bens',
    '4.1 Salários',
    '4.2 Plano de Saúde',
    '4.3 Aluguel e Condomínio',
    '4.4 Telefone / Internet',
    '4.5 Impostos e Contribuições',
    '4.6 Material de Uso e Consumo',
    '4.7 Despesa com Veículos',
    '4.8 Máquinas, Equipamentos e Ferramentas',
    '4.9 Seguros',
    '4.10 Publicidade / Marketing / Propaganda',
    '4.11 Manutenção e Reparos',
    '4.12 Cartão de Crédito',
    '4.13 Sistema de Gestão',
    '4.14 Serviços Técnicos de Terceiros',
    '4.15 Pró Labore',
    '4.16 Luz',
    '4.17 Despesa com Viagens',
    '4.18 Aluguel da Máquina de Cartão',
    '4.19 Cursos e Treinamentos',
    '4.20 Conselhos e Associações',
    '4.21 Cartório',
    '4.22 Outras Despesas Fixas',
    '4.23 Correios',
    '4.24 Vale Refeição / Alimentação',
    '4.25 Material de Expediente',
    '4.26 Consultoria e Assessoria',
    '4.28 Água',
    '4.29 Vale Transporte',
    '4.30 Contabilidade',
    '4.31 Softwares e Licenças',
    '4.32 Limpeza e Conservação',
    '4.33 Segurança e Monitoramento',
    '4.51 Demais Tributos',
    '4.52 Estacionamento / Garagem',
    '5.1 Cartão de Débito / Crédito (% sobre o valor)',
    '5.2 Juros sobre Empréstimos',
    '5.3 Tarifas, Taxas e Despesas Bancárias',
    '5.4 Outras Despesas Financeiras',
    '5.5 Financiamentos',
    '5.6 Tarifa sobre Cartão',
    '5.7 Juros',
    '5.8 IOF',
    '5.9 Multas',
    '5.10 Desconto de Duplicatas',
    '5.12 Estorno Bancário',
    '6.0 Distribuição de Lucros',
    '6.1 Empréstimos / Financiamentos',
    '6.2 Adiantamentos',
    '6.3 Mútuo',
    '6.4 Transferência entre Contas',
    '6.5 Devolução de Aporte de Sócios',
    '6.6 Pagamento por conta de clientes',
    '6.7 Devolução de valores a clientes',
    '6.8 Estorno de Recebimentos',
];
function classifyCode(code) {
    if (code === '1.10' || code === '6.4') {
        return {
            dreGroup: client_1.DreGroup.TRANSFER,
            cashFlowBlock: client_1.CashFlowBlock.OWN_ACCOUNT_TRANSFER,
        };
    }
    const group = code.split('.')[0];
    if (group === '2') {
        return { dreGroup: client_1.DreGroup.DEDUCTION, cashFlowBlock: client_1.CashFlowBlock.OPERATIONAL };
    }
    if (group === '3') {
        return { dreGroup: client_1.DreGroup.VARIABLE_COST, cashFlowBlock: client_1.CashFlowBlock.OPERATIONAL };
    }
    if (group === '4') {
        return { dreGroup: client_1.DreGroup.FIXED_EXPENSE, cashFlowBlock: client_1.CashFlowBlock.OPERATIONAL };
    }
    if (group === '5' || ['1.5', '1.6', '1.7', '1.9', '1.11'].includes(code)) {
        return {
            dreGroup: client_1.DreGroup.FINANCIAL_RESULT,
            cashFlowBlock: client_1.CashFlowBlock.FINANCIAL_MOVEMENTS,
        };
    }
    if (group === '6') {
        return {
            dreGroup: client_1.DreGroup.PROFIT_DISTRIBUTION,
            cashFlowBlock: client_1.CashFlowBlock.FINANCIAL_MOVEMENTS,
        };
    }
    return { dreGroup: client_1.DreGroup.GROSS_REVENUE, cashFlowBlock: client_1.CashFlowBlock.OPERATIONAL };
}
function leaf(labeled, type) {
    const [code, ...nameParts] = labeled.split(' ');
    const { dreGroup, cashFlowBlock } = classifyCode(code);
    return node(code, nameParts.join(' '), type, dreGroup, cashFlowBlock, false, code.split('.')[0]);
}
const CHART_OF_ACCOUNTS = [
    node('1', 'Receitas', client_1.TransactionType.INCOME, client_1.DreGroup.GROSS_REVENUE, client_1.CashFlowBlock.OPERATIONAL, true, null),
    ...SIMPOOW_INCOME.map((item) => leaf(item, client_1.TransactionType.INCOME)),
    node('2', 'Dedução das Receitas', client_1.TransactionType.EXPENSE, client_1.DreGroup.DEDUCTION, client_1.CashFlowBlock.OPERATIONAL, true, null),
    node('3', 'Custos Variáveis', client_1.TransactionType.EXPENSE, client_1.DreGroup.VARIABLE_COST, client_1.CashFlowBlock.OPERATIONAL, true, null),
    node('4', 'Despesas Fixas', client_1.TransactionType.EXPENSE, client_1.DreGroup.FIXED_EXPENSE, client_1.CashFlowBlock.OPERATIONAL, true, null),
    node('5', 'Resultado Financeiro', client_1.TransactionType.EXPENSE, client_1.DreGroup.FINANCIAL_RESULT, client_1.CashFlowBlock.FINANCIAL_MOVEMENTS, true, null),
    node('6', 'Distribuição de Lucro', client_1.TransactionType.EXPENSE, client_1.DreGroup.PROFIT_DISTRIBUTION, client_1.CashFlowBlock.FINANCIAL_MOVEMENTS, true, null),
    ...SIMPOOW_EXPENSE.map((item) => leaf(item, client_1.TransactionType.EXPENSE)),
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
            parentCode: type === client_1.TransactionType.INCOME ? '1' : '6',
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
                parentCode: '4.22',
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
        parentCode: '4.22',
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
                name: chartNode.name,
                type: chartNode.type,
                color: chartNode.color,
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
    for (const chartNode of CHART_OF_ACCOUNTS) {
        const existing = await prisma.financialCategory.findFirst({
            where: { companyId, code: chartNode.code },
        });
        if (existing && existing.name !== chartNode.name) {
            await prisma.financialCategory.update({
                where: { id: existing.id },
                data: { name: `__sync_${chartNode.code}` },
            });
        }
    }
    for (const chartNode of CHART_OF_ACCOUNTS) {
        const conflict = await prisma.financialCategory.findFirst({
            where: {
                companyId,
                name: chartNode.name,
                type: chartNode.type,
                NOT: { code: chartNode.code },
            },
        });
        if (conflict) {
            await prisma.financialCategory.update({
                where: { id: conflict.id },
                data: {
                    name: conflict.code
                        ? `__hold_${conflict.code}`
                        : `__hold_${conflict.id.slice(0, 8)}`,
                },
            });
        }
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