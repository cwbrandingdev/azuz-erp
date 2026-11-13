import { KanbanTaskContentType, KanbanTaskStatus, ProductionPhase } from '@prisma/client';
import { isSocialTaskContentType } from './kanban-content-type';

export const PRODUCTION_PHASE_DEFINITIONS: ReadonlyArray<{
  phase: ProductionPhase;
  label: string;
  color: string;
  order: number;
}> = [
  {
    phase: ProductionPhase.ROTEIRO,
    label: 'Roteiro',
    color: '#92400E',
    order: 1,
  },
  {
    phase: ProductionPhase.EM_GRAVACAO,
    label: 'Em gravação',
    color: '#EC4899',
    order: 2,
  },
];

export const PRODUCTION_PHASE_COLORS: Record<ProductionPhase, string> =
  Object.fromEntries(
    PRODUCTION_PHASE_DEFINITIONS.map((def) => [def.phase, def.color]),
  ) as Record<ProductionPhase, string>;

export const PRODUCTION_PHASE_LABELS: Record<ProductionPhase, string> =
  Object.fromEntries(
    PRODUCTION_PHASE_DEFINITIONS.map((def) => [def.phase, def.label]),
  ) as Record<ProductionPhase, string>;

export const DEFAULT_PRODUCTION_PHASE = ProductionPhase.ROTEIRO;

export function contentTypeRequiresScript(
  contentType?: KanbanTaskContentType | null,
) {
  return (
    contentType == null ||
    contentType === KanbanTaskContentType.VIDEO_WITH_SCRIPT
  );
}

export function defaultProductionPhaseForContentType(
  contentType?: KanbanTaskContentType | null,
): ProductionPhase | null {
  if (!isSocialTaskContentType(contentType)) return null;
  return contentTypeRequiresScript(contentType)
    ? ProductionPhase.ROTEIRO
    : ProductionPhase.EM_GRAVACAO;
}

export type ProductionPhaseApi = 'roteiro' | 'em_gravacao';

export function phaseToApi(phase: ProductionPhase): ProductionPhaseApi {
  return phase.toLowerCase() as ProductionPhaseApi;
}

export function phaseFromApi(value: ProductionPhaseApi): ProductionPhase {
  return value.toUpperCase() as ProductionPhase;
}

export function isProductionPhase(value: unknown): value is ProductionPhase {
  return (
    value === ProductionPhase.ROTEIRO || value === ProductionPhase.EM_GRAVACAO
  );
}

export function resolveProductionPhaseForStatus(
  status: KanbanTaskStatus,
  currentPhase: ProductionPhase | null | undefined,
  requestedPhase?: ProductionPhase | null,
  contentType?: KanbanTaskContentType | null,
): ProductionPhase | null {
  if (status !== KanbanTaskStatus.FALTA_GRAVAR) {
    return null;
  }

  if (!isSocialTaskContentType(contentType)) {
    return null;
  }

  if (isProductionPhase(requestedPhase)) {
    return requestedPhase;
  }

  if (isProductionPhase(currentPhase)) {
    return currentPhase;
  }

  return defaultProductionPhaseForContentType(contentType);
}

export function resolveTaskDisplayColor(
  status: KanbanTaskStatus,
  productionPhase: ProductionPhase | null | undefined,
  statusColors: Record<KanbanTaskStatus, string>,
): string {
  if (status === KanbanTaskStatus.FALTA_GRAVAR && productionPhase) {
    return PRODUCTION_PHASE_COLORS[productionPhase];
  }

  return statusColors[status];
}

export function resolveTaskDisplayLabel(
  status: KanbanTaskStatus,
  productionPhase: ProductionPhase | null | undefined,
  statusLabels: Record<KanbanTaskStatus, string>,
): string {
  if (status === KanbanTaskStatus.FALTA_GRAVAR && productionPhase) {
    return PRODUCTION_PHASE_LABELS[productionPhase];
  }

  return statusLabels[status];
}
