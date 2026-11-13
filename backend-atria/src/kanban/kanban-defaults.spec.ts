import {
  KanbanTaskContentType,
  KanbanTaskStatus,
  ProductionPhase,
} from '@prisma/client';
import { DEFAULT_TASK_STATUS } from './kanban-defaults';
import {
  DEFAULT_TASK_CONTENT_TYPE,
  contentTypeToApi,
} from './kanban-content-type';
import {
  STATUS_COLORS,
  STATUS_LABELS,
  statusFromApi,
  statusToApi,
} from './kanban-status';
import { toTaskClientResponse, toUnifiedTaskCore } from './kanban-task.mapper';
import {
  DEFAULT_PRODUCTION_PHASE,
  PRODUCTION_PHASE_COLORS,
  PRODUCTION_PHASE_LABELS,
  resolveProductionPhaseForStatus,
} from './production-phase';

describe('Kanban defaults & status', () => {
  it('defaults new tasks to FALTA_GRAVAR with Roteiro indicator', () => {
    expect(DEFAULT_TASK_STATUS).toBe(KanbanTaskStatus.FALTA_GRAVAR);
    expect(DEFAULT_PRODUCTION_PHASE).toBe(ProductionPhase.ROTEIRO);
    expect(STATUS_COLORS[DEFAULT_TASK_STATUS]).toBe('#78716C');
    expect(STATUS_LABELS[DEFAULT_TASK_STATUS]).toBe('Em produção');
    expect(PRODUCTION_PHASE_COLORS[DEFAULT_PRODUCTION_PHASE]).toBe('#92400E');
    expect(PRODUCTION_PHASE_LABELS[DEFAULT_PRODUCTION_PHASE]).toBe('Roteiro');
    expect(contentTypeToApi(DEFAULT_TASK_CONTENT_TYPE)).toBe('video_with_script');
  });

  it('maps status to/from API safely', () => {
    expect(statusToApi(KanbanTaskStatus.FALTA_GRAVAR)).toBe('falta_gravar');
    expect(statusFromApi('ok')).toBe(KanbanTaskStatus.OK);
  });
});

describe('Kanban task mapper', () => {
  it('handles null client without throwing', () => {
    expect(toTaskClientResponse(null)).toBeNull();
    expect(toTaskClientResponse(undefined)).toBeNull();
  });

  it('builds unified task core with production phase color/label', () => {
    const core = toUnifiedTaskCore({
      id: 'task-1',
      title: 'Filmagem',
      description: null,
      status: KanbanTaskStatus.FALTA_GRAVAR,
      productionPhase: ProductionPhase.EM_GRAVACAO,
      dueDate: null,
      clientId: null,
      companyId: 'company-1',
      createdAt: new Date('2026-08-05T12:00:00.000Z'),
      client: null,
    });

    expect(core.status).toBe('falta_gravar');
    expect(core.productionPhase).toBe('em_gravacao');
    expect(core.contentType).toBe('video_with_script');
    expect(core.statusColor).toBe('#EC4899');
    expect(core.statusLabel).toBe('Em gravação');
    expect(core.dueDate).toBeNull();
    expect(core.client).toBeNull();
  });
});

describe('Non-social deliverable types', () => {
  it('does not assign a recording phase to presentations and other deliverables', () => {
    expect(
      resolveProductionPhaseForStatus(
        KanbanTaskStatus.FALTA_GRAVAR,
        null,
        undefined,
        KanbanTaskContentType.PRESENTATION,
      ),
    ).toBeNull();
    expect(
      resolveProductionPhaseForStatus(
        KanbanTaskStatus.FALTA_GRAVAR,
        ProductionPhase.ROTEIRO,
        undefined,
        KanbanTaskContentType.DOCUMENT,
      ),
    ).toBeNull();
  });
});
