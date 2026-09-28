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

export const FINANCE_TUTORIAL_STORAGE_VERSION = "v3";

export const FINANCE_TUTORIAL_TAB_LABELS: Record<FinanceTutorialTabId, string> = {
  dashboard: "Dashboard",
  lancamentos: "Lançamentos",
  "movimentos-pendentes": "Bater extrato",
  "fluxo-de-caixa": "Entradas e saídas",
  "fluxo-projetado": "Previsão",
  dre: "Resultado do ano",
  "plano-de-contas": "Categorias",
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
        "Dashboard resume o período. Lançamentos é o livro: crie, edite e veja receitas e despesas.",
    },
    {
      target: '[data-tour="finance-kpi"]',
      title: "Indicadores do período",
      body:
        "Receita, despesas, resultado e valores em aberto. O padrão é o mês atual. Clique em qualquer cartão para abrir a lista correspondente.",
    },
    {
      target: '[data-tour="finance-period"]',
      title: "Mês atual ou ano todo",
      body:
        "Começa no mês de hoje. Troque o mês ou escolha Ano todo para ver o exercício completo.",
    },
    {
      target: '[data-tour="finance-recent"]',
      title: "Últimos lançamentos",
      body:
        "A prévia dos movimentos mais recentes. Use Ver todos para abrir o livro completo.",
    },
    {
      target: '[data-tour="finance-view-toggle"]',
      title: "Modo planilha",
      body:
        "Edição em massa, no estilo planilha. O dia a dia de consultar e lançar fica em Lançamentos.",
    },
    {
      target: '[data-tour="finance-balance"]',
      title: "Saldo disponível",
      body:
        "Soma apenas lançamentos já pagos. É o dinheiro realizado, antes das contas ainda em aberto.",
    },
    {
      target: '[data-tour="finance-period-filter"]',
      title: "Filtro da análise",
      body:
        "Ajuste o intervalo da análise e dos gráficos. Por padrão cobre o ano selecionado.",
    },
  ],
  lancamentos: [
    {
      target: '[data-tour="finance-subnav"]',
      title: "Onde você está",
      body: "Esta é a lista de todos os lançamentos. O dashboard resume; aqui você opera o livro.",
    },
    {
      target: '[data-tour="finance-lancamentos-header"]',
      title: "Livro de lançamentos",
      body:
        "Receitas e despesas do ano — ou do mês, se filtrar. Depois de salvar, o registro aparece nesta lista.",
    },
    {
      target: '[data-tour="finance-lancamentos-actions"]',
      title: "Novo lançamento",
      body:
        "Registre um recebimento ou pagamento. Informe plano de contas, vencimento e, se quiser, o banco. Dá para importar planilha ou cadastrar contas bancárias.",
    },
    {
      target: '[data-tour="finance-lancamentos-list"]',
      title: "Todas as transações",
      body:
        "Busque, filtre por tipo e status, edite, marque como pago ou exclua. Este é o lugar para conferir o que entrou.",
    },
  ],
  "movimentos-pendentes": [
    {
      target: '[data-tour="finance-subnav"]',
      title: "Bater extrato",
      body: "Aqui você confere se o que o banco registrou é o mesmo que está no Atria.",
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
      title: "Entradas e saídas",
      body: "Lista o dinheiro que já entrou e saiu, agrupado por tipo de categoria.",
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
      title: "Previsão",
      body: "Mostra quanto sobra se os lançamentos ainda em aberto forem pagos daqui pra frente.",
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
      title: "Resultado do ano",
      body: "Receita, custos e lucro mês a mês. É o relatório que o contador chama de DRE.",
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
      title: "Categorias",
      body: "Os tipos de receita e despesa usados ao lançar. Cada um entra em um grupo do resultado do ano.",
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
