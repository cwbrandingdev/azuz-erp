import type { KanbanTaskContentType, KanbanTaskStatus, ProductionPhase } from "@/services/types";
import {
  defaultProductionPhaseForContentType,
  isSocialContentType,
} from "@/lib/task-content-type";

export const PRODUCTION_PHASE_DEFINITIONS: ReadonlyArray<{
  phase: ProductionPhase;
  label: string;
  color: string;
  order: number;
}> = [
  {
    phase: "roteiro",
    label: "Roteiro",
    color: "#92400E",
    order: 1,
  },
  {
    phase: "em_gravacao",
    label: "Já Gravado",
    color: "#EC4899",
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

export const PRODUCTION_PHASE_ORDER: ProductionPhase[] =
  PRODUCTION_PHASE_DEFINITIONS.map((def) => def.phase);

export const DEFAULT_PRODUCTION_PHASE: ProductionPhase = "roteiro";

export type RecordingFilter = "" | "gravado" | "pendente";

export const RECORDING_FILTER_OPTIONS: ReadonlyArray<{
  value: RecordingFilter;
  label: string;
}> = [
  { value: "", label: "Todos" },
  { value: "gravado", label: "Já gravado" },
  { value: "pendente", label: "Pendente de gravação" },
];

export function isTaskRecorded(task: {
  status: KanbanTaskStatus;
  productionPhase?: ProductionPhase | null;
  contentType?: KanbanTaskContentType | null;
}): boolean {
  if (task.contentType && !isSocialContentType(task.contentType)) return true;
  if (task.status !== "falta_gravar") return true;
  return task.productionPhase === "em_gravacao";
}

export function matchesRecordingFilter(
  task: {
    status: KanbanTaskStatus;
    productionPhase?: ProductionPhase | null;
    contentType?: KanbanTaskContentType | null;
  },
  filter: RecordingFilter,
): boolean {
  if (!filter) return true;
  if (task.contentType && !isSocialContentType(task.contentType)) return false;
  const recorded = isTaskRecorded(task);
  return filter === "gravado" ? recorded : !recorded;
}

export function matchesEventRecordingFilter(
  event: {
    kanbanTaskId: string | null;
    taskStatus: KanbanTaskStatus | null;
    productionPhase?: ProductionPhase | null;
    task?: {
      status: KanbanTaskStatus;
      productionPhase?: ProductionPhase | null;
      contentType?: KanbanTaskContentType | null;
    } | null;
  },
  filter: RecordingFilter,
): boolean {
  if (!filter) return true;
  if (!event.kanbanTaskId) return false;

  const status =
    event.taskStatus ?? event.task?.status ?? null;
  const productionPhase =
    event.productionPhase ?? event.task?.productionPhase ?? null;

  if (!status) return false;

  return matchesRecordingFilter(
    { status, productionPhase, contentType: event.task?.contentType },
    filter,
  );
}

export function isProductionPhase(value: unknown): value is ProductionPhase {
  return value === "roteiro" || value === "em_gravacao";
}

export function resolveProductionPhaseForStatus(
  status: KanbanTaskStatus,
  currentPhase: ProductionPhase | null | undefined,
  requestedPhase?: ProductionPhase | null,
  contentType?: KanbanTaskContentType | null,
): ProductionPhase | null {
  if (status !== "falta_gravar") {
    return null;
  }

  if (!isSocialContentType(contentType)) {
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
  if (status === "falta_gravar" && productionPhase) {
    return PRODUCTION_PHASE_COLORS[productionPhase];
  }

  return statusColors[status];
}

export function resolveTaskDisplayLabel(
  status: KanbanTaskStatus,
  productionPhase: ProductionPhase | null | undefined,
  statusLabels: Record<KanbanTaskStatus, string>,
): string {
  if (status === "falta_gravar" && productionPhase) {
    return PRODUCTION_PHASE_LABELS[productionPhase];
  }

  return statusLabels[status];
}
