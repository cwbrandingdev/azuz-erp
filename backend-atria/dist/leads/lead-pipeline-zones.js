"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLIENT_ZONE_STATUSES = exports.SDR_ZONE_STATUSES = void 0;
exports.isSdrZoneStatus = isSdrZoneStatus;
exports.isClientZoneStatus = isClientZoneStatus;
exports.resolveCrmMoveZone = resolveCrmMoveZone;
exports.assertLeadStatusMoveAllowed = assertLeadStatusMoveAllowed;
const client_1 = require("@prisma/client");
const permissions_1 = require("../auth/constants/permissions");
exports.SDR_ZONE_STATUSES = [
    client_1.LeadStatus.PRE_VENDA,
    client_1.LeadStatus.APRESENTACAO,
    client_1.LeadStatus.REUNIAO_AGENDADA,
    client_1.LeadStatus.AGUARDANDO_ENTREGA,
    client_1.LeadStatus.AGUARDANDO_RESPOSTA,
];
exports.CLIENT_ZONE_STATUSES = [
    client_1.LeadStatus.VENDA_FINALIZADA,
    client_1.LeadStatus.NAO_TEM_INTERESSE,
    client_1.LeadStatus.AGUARDANDO_RESPOSTA,
];
function isSdrZoneStatus(status) {
    return exports.SDR_ZONE_STATUSES.includes(status);
}
function isClientZoneStatus(status) {
    return exports.CLIENT_ZONE_STATUSES.includes(status);
}
function resolveCrmMoveZone(role) {
    const roleName = (0, permissions_1.normalizeRoleName)(role);
    if (!roleName)
        return 'none';
    if (roleName === client_1.RoleName.MASTER || roleName === client_1.RoleName.ADMIN) {
        return 'all';
    }
    if (roleName === client_1.RoleName.CRM) {
        return 'sdr';
    }
    if (roleName === client_1.RoleName.CLIENT) {
        return 'all';
    }
    if (roleName === client_1.RoleName.EXTERNAL_CLIENT_CRM) {
        return 'client';
    }
    return 'none';
}
function assertLeadStatusMoveAllowed(role, fromStatus, toStatus) {
    const zone = resolveCrmMoveZone(role);
    if (zone === 'all')
        return;
    if (zone === 'sdr') {
        if (!isSdrZoneStatus(fromStatus) || !isSdrZoneStatus(toStatus)) {
            throw new Error('SDR users can only move leads within pré-venda, apresentação, reunião agendada, aguardando documentos and aguardando resposta.');
        }
        return;
    }
    if (zone === 'client') {
        if (!isClientZoneStatus(fromStatus) || !isClientZoneStatus(toStatus)) {
            throw new Error('Client users can only move leads from venda finalizada onward.');
        }
        return;
    }
    throw new Error('Insufficient permissions to move leads.');
}
//# sourceMappingURL=lead-pipeline-zones.js.map