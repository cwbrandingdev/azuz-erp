export type FinanceTutorialTabId =
  | "dashboard"
  | "lancamentos"
  | "movimentos-pendentes"
  | "fluxo-de-caixa"
  | "fluxo-projetado"
  | "dre"
  | "plano-de-contas";

export type FinanceTutorialStep = {
  target: string;
  title: string;
  body: string;
};

export const FINANCE_TUTORIAL_STORAGE_VERSION = "v1";

export const FINANCE_TUTORIAL_TAB_LABELS: Record<FinanceTutorialTabId, string> = {
  dashboard: "Dashboard",
  lancamentos: "Lançamentos",
  "movimentos-pendentes": "Mov. Pendentes",
  "fluxo-de-caixa": "Fluxo de Caixa",
  "fluxo-projetado": "FC Projetado",
  dre: "DRE",
  "plano-de-contas": "Plano de Contas",
};

export const FINANCE_TUTORIAL_STEPS: Record<
  FinanceTutorialTabId,
  FinanceTutorialStep[]
> = {
  dashboard: [
    {
      target: '[data-tour="finance-subnav"]',
      title: "Navegação do financeiro",
      body:
        "Use estas abas para alternar entre o painel, lançamentos, conciliação, fluxos, DRE e plano de contas.",
    },
    {
      target: '[data-tour="finance-kpi"]',
      title: "Indicadores do período",
      body:
        "Receita, despesas, saldo líquido e valores pendentes a receber e a pagar no mês selecionado.",
    },
    {
      target: '[data-tour="finance-period"]',
      title: "Período dos indicadores",
      body:
        "Troque o mês para atualizar os cartões de resumo. Os gráficos abaixo usam o filtro de datas próprio.",
    },
    {
      target: '[data-tour="finance-view-toggle"]',
      title: "Visão geral ou planilha",
      body:
        "Na visão geral você analisa saldos e gráficos. Na planilha edita lançamentos em massa, como uma planilha.",
    },
    {
      target: '[data-tour="finance-balance"]',
      title: "Saldo disponível",
      body:
        "Soma apenas lançamentos já pagos. É o dinheiro que você tem hoje, antes das contas ainda em aberto.",
    },
    {
      target: '[data-tour="finance-period-filter"]',
      title: "Filtro da análise",
      body:
        "Defina o intervalo para a demonstração do resultado e os gráficos históricos do painel.",
    },
  ],
  lancamentos: [
    {
      target: '[data-tour="finance-subnav"]',
      title: "Onde você está",
      body: "Volte ao dashboard ou avance para conciliação e relatórios pelas abas superiores.",
    },
    {
      target: '[data-tour="finance-lancamentos-header"]',
      title: "Lançamentos rápidos",
      body:
        "Registre entradas e saídas no livro-caixa. Cada lançamento usa plano de contas e, se quiser, um banco.",
    },
    {
      target: '[data-tour="finance-lancamentos-banks"]',
      title: "Contas bancárias",
      body:
        "Cadastre bancos e caixas e importe extratos OFX. Eles aparecem nos lançamentos e na conciliação.",
    },
    {
      target: '[data-tour="finance-lancamentos-income"]',
      title: "Entradas",
      body:
        "Receitas, recebimentos e outros créditos. Marque como já recebido ou deixe pendente para o fluxo projetado.",
    },
    {
      target: '[data-tour="finance-lancamentos-expense"]',
      title: "Saídas",
      body:
        "Despesas e pagamentos. Use recorrência para repetir o mesmo valor por vários meses.",
    },
  ],
  "movimentos-pendentes": [
    {
      target: '[data-tour="finance-subnav"]',
      title: "Conciliação bancária",
      body: "Esta aba liga o extrato importado aos lançamentos do sistema sem mudar valores ou categorias.",
    },
    {
      target: '[data-tour="finance-mov-header"]',
      title: "Objetivo da tela",
      body:
        "Encontre diferenças entre o banco e o Atria e feche pendências com segurança.",
    },
    {
      target: '[data-tour="finance-mov-actions"]',
      title: "Filtro e ações",
      body:
        "Escolha o banco, concilie um par selecionado ou ignore linhas do extrato em lote.",
    },
    {
      target: '[data-tour="finance-mov-bank-lines"]',
      title: "Extrato do banco",
      body:
        "Linhas vindas do OFX. Selecione uma com o círculo para conciliar ou marque várias para ignorar.",
    },
    {
      target: '[data-tour="finance-mov-atria-lines"]',
      title: "Lançamentos no Atria",
      body:
        "Pendências do sistema que ainda não foram ligadas ao extrato. Escolha o lançamento correspondente.",
    },
  ],
  "fluxo-de-caixa": [
    {
      target: '[data-tour="finance-subnav"]',
      title: "Fluxo de caixa realizado",
      body: "Aqui você vê o que entrou e saiu, agrupado por blocos contábeis do plano de contas.",
    },
    {
      target: '[data-tour="finance-fc-filters"]',
      title: "Filtros",
      body:
        "Período, tipo, plano, banco, status e busca por descrição. Clique em Buscar para atualizar a lista.",
    },
    {
      target: '[data-tour="finance-fc-blocks"]',
      title: "Blocos do fluxo",
      body:
        "Operacional, movimentações financeiras e transferências entre contas, cada um com totais de entrada, saída e saldo.",
    },
    {
      target: '[data-tour="finance-fc-net"]',
      title: "Variação líquida",
      body: "Resumo do período filtrado: quanto o caixa variou no total entre todos os blocos.",
    },
  ],
  "fluxo-projetado": [
    {
      target: '[data-tour="finance-subnav"]',
      title: "Projeção futura",
      body: "Simule o caixa a partir de amanhã usando apenas lançamentos ainda não pagos.",
    },
    {
      target: '[data-tour="finance-fp-balance"]',
      title: "Saldo atual realizado",
      body: "Ponto de partida: tudo que já foi pago até hoje, antes de projetar pendências.",
    },
    {
      target: '[data-tour="finance-fp-filters"]',
      title: "Filtros da projeção",
      body:
        "Limite a data final ou o tipo (entrada/saída) para enxergar só o que importa no horizonte.",
    },
    {
      target: '[data-tour="finance-fp-table"]',
      title: "Saldo acumulado",
      body:
        "Cada dia mostra entradas, saídas e o saldo projetado após considerar os pendentes daquela data.",
    },
  ],
  dre: [
    {
      target: '[data-tour="finance-subnav"]',
      title: "Demonstração do resultado",
      body: "Visão anual por competência (data do lançamento), alinhada ao plano de contas.",
    },
    {
      target: '[data-tour="finance-dre-header"]',
      title: "Ano e exportação",
      body: "Troque o exercício e exporte a DRE em Excel ou PDF para compartilhar.",
    },
    {
      target: '[data-tour="finance-dre-table"]',
      title: "Estrutura da DRE",
      body:
        "Receitas, custos e despesas por conta, com totais mensais, resultado gerencial e saldo disponível.",
    },
  ],
  "plano-de-contas": [
    {
      target: '[data-tour="finance-subnav"]',
      title: "Plano de contas",
      body: "Todas as categorias usadas nos lançamentos, organizadas por grupo contábil.",
    },
    {
      target: '[data-tour="finance-coa-header"]',
      title: "Classificação",
      body:
        "Cada conta indica se é entrada ou saída e em qual grupo da DRE e do fluxo de caixa ela entra.",
    },
    {
      target: '[data-tour="finance-coa-groups"]',
      title: "Grupos e contas",
      body:
        "Expanda mentalmente por grupo: as contas filhas herdam a classificação para relatórios consistentes.",
    },
  ],
};

export function financeTutorialStorageKey(tabId: FinanceTutorialTabId) {
  return `atria-finance-tutorial-${FINANCE_TUTORIAL_STORAGE_VERSION}:${tabId}`;
}

export function pathnameToFinanceTutorialTab(
  pathname: string,
): FinanceTutorialTabId | null {
  if (pathname === "/financial") return "dashboard";
  if (pathname === "/financial/lancamentos") return "lancamentos";
  if (pathname === "/financial/movimentos-pendentes") return "movimentos-pendentes";
  if (pathname === "/financial/fluxo-de-caixa") return "fluxo-de-caixa";
  if (pathname === "/financial/fluxo-projetado") return "fluxo-projetado";
  if (pathname === "/financial/dre") return "dre";
  if (pathname === "/financial/plano-de-contas") return "plano-de-contas";
  return null;
}
