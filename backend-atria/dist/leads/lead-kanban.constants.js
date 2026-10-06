"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEAD_STATUS_COLORS = exports.LEAD_STATUS_LABELS = exports.LEAD_KANBAN_STATUSES = exports.ORCAMENTO_STAGE_COLOR = exports.ORCAMENTO_STAGE_NAME = exports.ORCAMENTO_STAGE_KEY = void 0;
const client_1 = require("@prisma/client");
exports.ORCAMENTO_STAGE_KEY = 'ORCAMENTO';
exports.ORCAMENTO_STAGE_NAME = 'Orçamento';
exports.ORCAMENTO_STAGE_COLOR = '#0D9488';
exports.LEAD_KANBAN_STATUSES = [
    client_1.LeadStatus.PRE_VENDA,
    client_1.LeadStatus.APRESENTACAO,
    client_1.LeadStatus.REUNIAO_AGENDADA,
    client_1.LeadStatus.AGUARDANDO_ENTREGA,
    client_1.LeadStatus.VENDA_FINALIZADA,
    client_1.LeadStatus.AGUARDANDO_RESPOSTA,
    client_1.LeadStatus.NAO_TEM_INTERESSE,
];
exports.LEAD_STATUS_LABELS = {
    [client_1.LeadStatus.PRE_VENDA]: 'Pré venda',
    [client_1.LeadStatus.APRESENTACAO]: 'Apresentação',
    [client_1.LeadStatus.REUNIAO_AGENDADA]: 'Reunião agendada',
    [client_1.LeadStatus.VENDA_FINALIZADA]: 'Venda finalizada',
    [client_1.LeadStatus.AGUARDANDO_ENTREGA]: 'Aguardando documentos',
    [client_1.LeadStatus.POS_VENDA]: 'Pós venda',
    [client_1.LeadStatus.NAO_TEM_INTERESSE]: 'Não tem interesse',
    [client_1.LeadStatus.AGUARDANDO_RESPOSTA]: 'Aguardando resposta',
};
exports.LEAD_STATUS_COLORS = {
    [client_1.LeadStatus.PRE_VENDA]: '#F97316',
    [client_1.LeadStatus.APRESENTACAO]: '#3B82F6',
    [client_1.LeadStatus.REUNIAO_AGENDADA]: '#8B5CF6',
    [client_1.LeadStatus.VENDA_FINALIZADA]: '#22C55E',
    [client_1.LeadStatus.AGUARDANDO_ENTREGA]: '#EAB308',
    [client_1.LeadStatus.POS_VENDA]: '#14B8A6',
    [client_1.LeadStatus.NAO_TEM_INTERESSE]: '#EF4444',
    [client_1.LeadStatus.AGUARDANDO_RESPOSTA]: '#64748B',
};
//# sourceMappingURL=lead-kanban.constants.js.map