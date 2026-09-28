export type PortalTutorialTabId =
  | "approval"
  | "requests"
  | "calendar"
  | "crm"
  | "crm-board";

export type PortalTutorialStep = {
  target: string;
  title: string;
  body: string;
  image?: string;
  imageAlt?: string;
};

export const PORTAL_TUTORIAL_STORAGE_VERSION = "v1";

export const PORTAL_TUTORIAL_TAB_LABELS: Record<PortalTutorialTabId, string> = {
  approval: "Conteúdo",
  requests: "Solicitações",
  calendar: "Calendário",
  crm: "CRM",
  "crm-board": "Funil comercial",
};

export const PORTAL_TUTORIAL_STEPS: Record<
  PortalTutorialTabId,
  PortalTutorialStep[]
> = {
  approval: [
    {
      target: '[data-tour="portal-nav"]',
      title: "Menu do portal",
      body:
        "Alterne entre os conteúdos para aprovar, solicitações que você pode fazer e o seu calendário de postagens.",
    },
    {
      target: '[data-tour="portal-content-header"]',
      title: "Aprovação de conteúdo",
      body:
        "Aqui você revisa as entregas da agência: confira a legenda e as mídias antes de aprovar uma postagem ou pedir um ajuste.",
    },
    {
      target: '[data-tour="portal-content-filters"]',
      title: "Filtros de status",
      body:
        "Para aprovar, solicitado ajuste e aprovado. O número em cada filtro mostra quantos itens estão nessa etapa.",
    },
    {
      target: '[data-tour="portal-content-workspace"]',
      title: "Lista e revisão",
      body:
        "Escolha uma entrega à esquerda. À direita você vê a legenda, as mídias e os botões para aprovar ou pedir ajustes.",
      image: "/portal-tutorial/revisao-legenda-botoes.png",
      imageAlt:
        "Painel de revisão com a legenda do post e os botões Aprovar Entrega e Solicitar Ajustes",
    },
  ],
  requests: [
    {
      target: '[data-tour="portal-nav"]',
      title: "Onde você está",
      body: "Volte ao conteúdo ou abra o calendário pelo menu.",
    },
    {
      target: '[data-tour="portal-requests-header"]',
      title: "Solicitações",
      body:
        "Envie pedidos de conteúdo e acompanhe a conversa com a equipe até a produção.",
    },
    {
      target: '[data-tour="portal-requests-new"]',
      title: "Nova solicitação",
      body:
        "Abra o formulário para descrever o pedido, o tipo de conteúdo e as referências.",
    },
    {
      target: '[data-tour="portal-requests-filters"]',
      title: "Status dos pedidos",
      body:
        "Filtre todas, pendentes, em produção ou recusadas para achar o que precisa de atenção.",
    },
    {
      target: '[data-tour="portal-requests-workspace"]',
      title: "Detalhe e discussão",
      body:
        "Selecione um pedido para ler a descrição e continuar a conversa com a equipe nos comentários.",
    },
  ],
  calendar: [
    {
      target: '[data-tour="portal-nav"]',
      title: "Calendário",
      body: "Este menu leva às publicações e aos marcos combinados com a agência.",
    },
    {
      target: '[data-tour="portal-calendar-month"]',
      title: "Mês",
      body:
        "Avance ou volte o mês. Os dias marcados mostram conteúdos e eventos. Clique em um dia para ver o detalhe.",
    },
    {
      target: '[data-tour="portal-calendar-day"]',
      title: "Dia selecionado",
      body:
        "Publicações, reuniões e prazos daquele dia, com plataforma, formato e status quando for conteúdo.",
    },
  ],
  crm: [
    {
      target: '[data-tour="portal-nav"]',
      title: "CRM",
      body: "Esta área só aparece quando a agência libera o funil comercial da sua empresa.",
    },
    {
      target: '[data-tour="portal-crm-card"]',
      title: "Abrir o funil",
      body:
        "No kanban você acompanha os leads, lê os comentários e move cada um para a etapa correspondente.",
    },
  ],
  "crm-board": [
    {
      target: '[data-tour="portal-crm-header"]',
      title: "Funil comercial",
      body:
        "Quadro dos leads da sua empresa. O total no topo mostra quantos estão no funil agora.",
    },
    {
      target: '[data-tour="portal-crm-board"]',
      title: "Etapas",
      body:
        "Cada coluna é uma etapa. Arraste um lead para movê-lo e abra o cartão para ver os comentários.",
    },
  ],
};

export function portalTutorialStorageKey(tabId: PortalTutorialTabId) {
  return `atria-portal-tutorial-${PORTAL_TUTORIAL_STORAGE_VERSION}:${tabId}`;
}

export function resolvePortalTutorialTab(
  pathname: string,
  activeTab: string | null | undefined,
): PortalTutorialTabId | null {
  if (pathname === "/client-portal/crm" || pathname.endsWith("/portal/crm")) {
    return "crm-board";
  }
  if (
    activeTab === "approval" ||
    activeTab === "requests" ||
    activeTab === "calendar" ||
    activeTab === "crm"
  ) {
    return activeTab;
  }
  return null;
}
