import { LeadStatus, RoleName } from '@prisma/client';
import { normalizeRoleName } from '../auth/constants/permissions';
import { ORCAMENTO_STAGE_KEY } from './lead-kanban.constants';

export const SDR_ZONE_STATUSES: readonly LeadStatus[] = [
  LeadStatus.PRE_VENDA,
  LeadStatus.APRESENTACAO,
  LeadStatus.REUNIAO_AGENDADA,
  LeadStatus.AGUARDANDO_ENTREGA,
  LeadStatus.AGUARDANDO_RESPOSTA,
] as const;

export const CLIENT_ZONE_STATUSES: readonly LeadStatus[] = [
  LeadStatus.VENDA_FINALIZADA,
  LeadStatus.NAO_TEM_INTERESSE,
  LeadStatus.AGUARDANDO_RESPOSTA,
] as const;

export type CrmMoveZone = 'all' | 'sdr' | 'client' | 'none';

export function isSdrZoneStatus(status: string): boolean {
  if (status === ORCAMENTO_STAGE_KEY) return true;
  return SDR_ZONE_STATUSES.includes(status as LeadStatus);
}

export function isClientZoneStatus(status: string): boolean {
  return CLIENT_ZONE_STATUSES.includes(status as LeadStatus);
}

export function resolveCrmMoveZone(role: string): CrmMoveZone {
  const roleName = normalizeRoleName(role);
  if (!roleName) return 'none';

  if (roleName === RoleName.MASTER || roleName === RoleName.ADMIN) {
    return 'all';
  }

  if (roleName === RoleName.CRM) {
    return 'sdr';
  }

  if (roleName === RoleName.CLIENT) {
    return 'all';
  }

  if (roleName === RoleName.EXTERNAL_CLIENT_CRM) {
    return 'client';
  }

  return 'none';
}

export function assertLeadStatusMoveAllowed(
  role: string,
  fromStatus: string,
  toStatus: string,
): void {
  const zone = resolveCrmMoveZone(role);
  if (zone === 'all') return;

  if (zone === 'sdr') {
    if (!isSdrZoneStatus(fromStatus) || !isSdrZoneStatus(toStatus)) {
      throw new Error(
        'SDR users can only move leads within pré-venda, apresentação, orçamento, reunião agendada, aguardando documentos and aguardando resposta.',
      );
    }
    return;
  }

  if (zone === 'client') {
    if (!isClientZoneStatus(fromStatus) || !isClientZoneStatus(toStatus)) {
      throw new Error(
        'Client users can only move leads from venda finalizada onward.',
      );
    }
    return;
  }

  throw new Error('Insufficient permissions to move leads.');
}
