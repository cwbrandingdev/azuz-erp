import type { ProposalStatus } from "@/services/types";

export const PROPOSAL_TEAL = "#004A4A";
export const PROPOSAL_GOLD = "#D4BA97";

export const CW_BASE_URL = "https://cwbranding.com.br";

export const CW_LOGO_URL = `${CW_BASE_URL}/cwbranding/cwbrandinglogo.png`;
export const CW_LOCAL_LOGO_URL = `${CW_BASE_URL}/cwbranding/cwbnossolocal.png`;
export const CW_PINHAO_URL = `${CW_BASE_URL}/cwbranding/pinhao.png`;
export const CW_MAIN_SERVICES_IMAGE_URL = `${CW_BASE_URL}/cwbranding/mainservicesimagept.png`;

export const DEFAULT_COVER_VIDEO_URL = `${CW_BASE_URL}/cwbranding/videofundo.mp4`;
export const DEFAULT_COVER_IMAGE_URL = `${CW_BASE_URL}/cwbranding/cwbrandinglogo.png`;

export const LOCAL_SPACE_IMAGES = Array.from({ length: 10 }, (_, index) => ({
  id: `space-${index + 1}`,
  src: `${CW_BASE_URL}/fotos-espaco/${index + 1}.png`,
  alt: `Espaço CWBranding ${index + 1}`,
}));

export const CW_PARTNER_LOGOS = Array.from({ length: 10 }, (_, index) => ({
  id: `partner-${index + 1}`,
  src: `https://cwbranding.com.br/parceiros-cwbranding/${index + 1}.png`,
  alt: `Parceiro ${index + 1}`,
}));

export const DEFAULT_STRUCTURE_CONTENT = `Confiança se constrói com solidez e transparência. Nossa sede, em frente ao Palácio Avenida, no coração de Curitiba, é a prova de que somos uma empresa real e consolidada — um espaço onde estratégias ganham vida e parcerias duradouras se fortalecem.`;

export const DEFAULT_SCHEDULING_URL = "https://cwbranding.com.br/";

export const ABOUT_AGENCY_COPY = {
  title: "Quem Somos",
  paragraphs: [
    "A CWBranding nasceu com um propósito simples: ajudar marcas a se comunicarem melhor, com mais verdade e criatividade. Acreditamos que toda marca tem uma história única pra contar — e o nosso papel é dar vida a essa história.",
    "Somos especialistas em criar uma presença digital marcante, que ajuda nossos parceiros a se destacarem no seu setor com estratégia, design e execução impecável.",
  ],
  tags: [
    "#SejaAUTÊNTICO",
    "#SejaESTRATÉGICO",
    "#SejaCRIATIVO",
    "#SejaMARCANTE",
  ],
};

export const PROPOSAL_SERVICES = [
  {
    id: "social-media",
    title: "Social Media",
    description:
      "Criação e gestão de conteúdo para redes sociais, incluindo estratégias de engajamento e crescimento de audiência.",
    imageUrl: `${CW_BASE_URL}/fotos-servicos/SOCIAL%20MEDIA.png`,
  },
  {
    id: "branding",
    title: "Identidade Visual",
    description:
      "Conjunto de elementos gráficos que representam visualmente uma marca — logo, cores, tipografia e padrões visuais.",
    imageUrl: `${CW_BASE_URL}/fotos-servicos/IDENTIDADE%20VISUAL.png`,
  },
  {
    id: "traffic",
    title: "Gestão de Tráfego",
    description:
      "Planejamento e execução de campanhas de mídia paga para direcionar visitantes qualificados para a empresa.",
    imageUrl: `${CW_BASE_URL}/fotos-servicos/TR%C3%81FEGO.png`,
  },
  {
    id: "landing-pages",
    title: "Landing Pages",
    description:
      "Páginas web específicas criadas para converter visitantes em leads ou clientes através de uma experiência focada.",
    imageUrl: `${CW_BASE_URL}/fotos-servicos/LANDING%20PAGES.png`,
  },
  {
    id: "marketing-advisory",
    title: "Assessoria de Marketing",
    description:
      "Consultoria estratégica para empresas desenvolverem e implementarem planos de marketing eficazes.",
    imageUrl: `${CW_BASE_URL}/fotos-servicos/ASSESSORIA.png`,
  },
  {
    id: "photo-shoots",
    title: "Ensaios Fotográficos",
    description:
      "Produção de fotografias profissionais para materiais de marketing, redes sociais e comunicação da marca.",
    imageUrl: `${CW_BASE_URL}/fotos-servicos/ENSAIOS%20FOTOGRAFICOS.png`,
  },
  {
    id: "graphic-materials",
    title: "Materiais Gráficos",
    description:
      "Peças visuais impressas ou digitais — folders, banners, cartões, apresentações e demais materiais.",
    imageUrl: `${CW_BASE_URL}/fotos-servicos/MATERIAIS%20GR%C3%81FICOS.png`,
  },
  {
    id: "events",
    title: "Cobertura de Eventos",
    description:
      "Planejamento e execução da cobertura de eventos institucionais ou promocionais da marca.",
    imageUrl: `${CW_BASE_URL}/fotos-servicos/EVENTOS.png`,
  },
] as const;

export const PROPOSAL_PRICING_PLANS = [
  {
    id: "posicionamento",
    name: "PROJETO DE POSICIONAMENTO",
    price: 5699,
    description:
      "Para empresas que estão crescendo financeiramente e precisam que sua marca cresça na mesma proporção.",
    items: [
      "Planejamento Estratégico Mensal de Conteúdo (média de 75 conteúdos mensais com foco em posicionamento, autoridade e conversão)",
      "Diagnóstico Estratégico de Marca e Posicionamento",
      "Produção de Conteúdo Premium para Redes Sociais",
      "Produção Fotográfica Corporativa Premium",
      "Cobertura Estratégica de Eventos Corporativos",
      "Desenvolvimento de Landing Pages de Alta Performance",
      "Gestão Completa de Google Ads e Google Business Profile",
      "Gestão de Mídia Paga no Ecossistema Meta (Facebook e Instagram), com planejamento, criação, otimização e acompanhamento de até 4 campanhas simultâneas",
      "Planejamento de Campanhas e Calendário Editorial Mensal",
      "Direção Criativa para Captação de Conteúdo",
      "Análise de Performance e Relatórios Estratégicos Mensais",
      "Reuniões Mensais de Performance e Crescimento",
      "Consultoria Estratégica de Marketing e Posicionamento de Marca",
      "Suporte Consultivo para Ações Comerciais e de Comunicação",
    ],
  },
  {
    id: "escala",
    name: "PROJETO DE ESCALA",
    price: 7999,
    description:
      "Para empresas que querem transformar posicionamento em oportunidades comerciais recorrentes.",
    items: [
      "ITENS DO PROJETO DE POSICIONAMENTO +",
      "Inteligência de Demanda e Mapeamento de Oportunidades",
      "Estruturação Estratégica de Geração de Leads",
      "Relatórios Estratégicos Quinzenais de Performance",
      "Otimização Contínua de Campanhas e Conversão",
      "Planejamento Comercial Integrado entre Marketing e Vendas",
      "10 Horas Semanais de Operação SDR Dedicada",
      "Gestão de Atendimento e Respostas Estratégicas nas Redes Sociais",
      "Base Exclusiva de Dados para Otimização e Escala de Campanhas",
      "Qualificação de Leads e Agendamento de Reuniões Comerciais",
      "Acompanhamento do Funil Comercial e Análise de Conversão",
    ],
    featured: true,
  },
  {
    id: "lideranca",
    name: "PROJETO DE LIDERANÇA",
    price: 9999,
    description:
      "Para empresas que querem ocupar a liderança do seu mercado através de marca, estratégia e crescimento comercial.",
    items: [
      "ITENS DO PROJETO DE ESCALA +",
      "Qualificação Estratégica de Oportunidades Comerciais",
      "Gestor Sênior de Crescimento Dedicado",
      "Reuniões Semanais de Performance e Crescimento",
      "Produção Audiovisual Premium com Captação Aérea (Drone)",
      "Integração Total entre Marketing, SDR e Comercial",
      "Acesso Exclusivo ao CRM CWBranding",
      "Dashboard Executivo com Indicadores em Tempo Real",
      "Consultoria Estratégica para Escala, Posicionamento e Expansão",
      "Alinhamento Contínuo entre Marketing, Comercial e Direção",
      "Inteligência de Dados para Tomada de Decisão",
      "Suporte Prioritário para Demandas Estratégicas",
      "20 Horas Semanais de Operação SDR Dedicada",
    ],
  },
] as const;

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Rascunho",
  published: "Publicada",
  expired: "Expirada",
  archived: "Arquivada",
};

export const PROPOSAL_STATUS_STYLES: Record<ProposalStatus, string> = {
  draft: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-800",
  expired: "bg-red-100 text-red-800",
  archived: "bg-gray-100 text-gray-600",
};

export function formatProposalCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatProposalDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

export function toDateInputValue(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export type ProposalPlanId =
  | "posicionamento"
  | "escala"
  | "lideranca"
  | "custom";

export const PROPOSAL_PLAN_OPTIONS: {
  id: ProposalPlanId;
  label: string;
  description: string;
}[] = [
  {
    id: "posicionamento",
    label: "Posicionamento",
    description: "Estruturar presença e posicionamento no mercado",
  },
  {
    id: "escala",
    label: "Escala",
    description: "Acelerar crescimento e aquisição de clientes",
  },
  {
    id: "lideranca",
    label: "Liderança",
    description: "Estrutura completa de marketing e geração de demanda",
  },
  {
    id: "custom",
    label: "Plano personalizado",
    description: "Montar serviços e valor à parte",
  },
];

export function slugifyCompanyName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getPlanFormDefaults(planId: ProposalPlanId) {
  if (planId === "custom") {
    return {
      title: "",
      totalValue: 0,
      items: [{ name: "", description: "" }],
    };
  }

  const plan = PROPOSAL_PRICING_PLANS.find((entry) => entry.id === planId);
  if (!plan) {
    return {
      title: "",
      totalValue: 0,
      items: [{ name: "", description: "" }],
    };
  }

  return {
    title: plan.name,
    totalValue: plan.price,
    items: plan.items.map((name) => ({ name, description: "" })),
  };
}
