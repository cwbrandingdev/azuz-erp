import { LeadStatus } from '@prisma/client';

export const ORCAMENTO_STAGE_KEY = 'ORCAMENTO';
export const ORCAMENTO_STAGE_NAME = 'Orçamento';
export const ORCAMENTO_STAGE_COLOR = '#0D9488';

export const LEAD_KANBAN_STATUSES: readonly LeadStatus[] = [
  LeadStatus.PRE_VENDA,
  LeadStatus.APRESENTACAO,
  LeadStatus.REUNIAO_AGENDADA,
  LeadStatus.AGUARDANDO_ENTREGA,
  LeadStatus.VENDA_FINALIZADA,
  LeadStatus.AGUARDANDO_RESPOSTA,
  LeadStatus.NAO_TEM_INTERESSE,
] as const;

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.PRE_VENDA]: 'Pré venda',
  [LeadStatus.APRESENTACAO]: 'Apresentação',
  [LeadStatus.REUNIAO_AGENDADA]: 'Reunião agendada',
  [LeadStatus.VENDA_FINALIZADA]: 'Venda finalizada',
  [LeadStatus.AGUARDANDO_ENTREGA]: 'Aguardando documentos',
  [LeadStatus.POS_VENDA]: 'Pós venda',
  [LeadStatus.NAO_TEM_INTERESSE]: 'Não tem interesse',
  [LeadStatus.AGUARDANDO_RESPOSTA]: 'Aguardando resposta',
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  [LeadStatus.PRE_VENDA]: '#F97316',
  [LeadStatus.APRESENTACAO]: '#3B82F6',
  [LeadStatus.REUNIAO_AGENDADA]: '#8B5CF6',
  [LeadStatus.VENDA_FINALIZADA]: '#22C55E',
  [LeadStatus.AGUARDANDO_ENTREGA]: '#EAB308',
  [LeadStatus.POS_VENDA]: '#14B8A6',
  [LeadStatus.NAO_TEM_INTERESSE]: '#EF4444',
  [LeadStatus.AGUARDANDO_RESPOSTA]: '#64748B',
};
