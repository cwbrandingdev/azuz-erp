"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Bell, Phone, Search } from "lucide-react";
import { CrmDisabledEmptyState } from "@/components/leads/crm-disabled-empty-state";
import { CrmReminderKanban } from "@/components/leads/crm-reminder-kanban";
import { LeadDetailDialog } from "@/components/leads/lead-detail-dialog";
import { LeadFunnelSettingsDrawer } from "@/components/leads/lead-funnel-settings-drawer";
import { LeadKanbanFormDialog } from "@/components/leads/lead-kanban-form-dialog";
import { LeadKanbanImportDialog } from "@/components/leads/lead-kanban-import-dialog";
import { LeadKanbanCard } from "@/components/leads/lead-kanban-card";
import { NativeTelButton } from "@/components/leads/native-tel-button";
import { KanbanHorizontalScroll } from "@/components/kanban/kanban-horizontal-scroll";
import { PortalCrmSdrLeadsBanner } from "@/components/portal/portal-crm-sdr-leads-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { useOptionalDialer } from "@/contexts/dialer-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useSdrAssignedOrganizations } from "@/hooks/use-sdr-assigned-organizations";
import {
  canMoveLeadToColumn,
  type CrmMoveZone,
  isClientZoneStatus,
  isDragDisabledForZone,
  isSdrZoneStatus,
} from "@/lib/lead-pipeline-zones";
import {
  LEAD_KANBAN_STATUSES,
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  collectLeadCategories,
  leadColumnKey,
  leadMatchesCategory,
  leadMatchesSearchQuery,
  shouldLeadAutoMinimize,
} from "@/lib/leads-kanban-utils";
import { normalizeAppRole } from "@/lib/permissions";
import { isCrmDisabledApiError } from "@/lib/crm-errors";
import {
  countNewPortalSdrLeads,
  getPortalCrmLastSeenAt,
  markPortalCrmSeenNow,
} from "@/lib/portal-crm-notifications";
import { toast } from "@/lib/toast";
import { isDialablePhone } from "@/lib/lead-phone";
import { clientPortalService, leadsService, organizationsService } from "@/services";
import type {
  CrmReminderBoard,
  Lead,
  LeadKanbanColumn,
} from "@/services/types";

function emptyColumns(): LeadKanbanColumn[] {
  return LEAD_KANBAN_STATUSES.map((status) => ({
    status,
    title: LEAD_STATUS_LABELS[status],
    color: LEAD_STATUS_COLORS[status],
    leads: [],
  }));
}

function emptyReminderBoard(): CrmReminderBoard {
  return {
    columns: [
      { status: "PENDING", title: "A fazer", tasks: [] },
      { status: "DONE", title: "Concluído", tasks: [] },
      { status: "CANCELLED", title: "Cancelado", tasks: [] },
    ],
    total: 0,
  };
}

interface LeadsKanbanBoardProps {
  portalClientView?: boolean;
  initialOrganizationId?: string;
}

export function LeadsKanbanBoard({
  portalClientView = false,
  initialOrganizationId,
}: LeadsKanbanBoardProps) {
  const { user } = useAuth();
  const dialer = useOptionalDialer();
  const { isMasterOrAdmin } = usePermissions();
  const isCrmUser = normalizeAppRole(user?.role) === "crm";
  const showClientFilter =
    !portalClientView && (isCrmUser || isMasterOrAdmin());
  const { organizations, loading: organizationsLoading } =
    useSdrAssignedOrganizations(showClientFilter);

  const [columns, setColumns] = useState<LeadKanbanColumn[]>(emptyColumns);
  const [reminderBoard, setReminderBoard] = useState<CrmReminderBoard>(
    emptyReminderBoard,
  );
  const [view, setView] = useState<"funnel" | "reminders">("funnel");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [crmMoveZone, setCrmMoveZone] = useState<CrmMoveZone>("all");
  const [clientFilter, setClientFilter] = useState(
    initialOrganizationId?.trim() || "all",
  );
  const [crmDisabled, setCrmDisabled] = useState(false);
  const [newSdrLeadCount, setNewSdrLeadCount] = useState(0);
  const [sdrBannerDismissed, setSdrBannerDismissed] = useState(false);

  const allClientsLabel = isMasterOrAdmin()
    ? "Todas as Empresas"
    : "Todos os Meus Clientes";

  const pendingReminders = useMemo(
    () =>
      reminderBoard.columns.find((column) => column.status === "PENDING")
        ?.tasks.length ?? 0,
    [reminderBoard],
  );

  const hasActiveFilters =
    !portalClientView &&
    (searchQuery.trim().length > 0 || categoryFilter !== "all");

  const dragDisabled =
    hasActiveFilters || isDragDisabledForZone(crmMoveZone, portalClientView);

  const allBoardLeads = useMemo(
    () => columns.flatMap((column) => column.leads),
    [columns],
  );

  const categoryOptions = useMemo(
    () => collectLeadCategories(allBoardLeads),
    [allBoardLeads],
  );

  const filteredColumns = useMemo(() => {
    if (portalClientView) return columns;

    const normalizedQuery = searchQuery.trim().toLowerCase();

    return columns.map((column) => ({
      ...column,
      leads: column.leads.filter((lead) => {
        if (
          categoryFilter !== "all" &&
          !leadMatchesCategory(lead, categoryFilter)
        ) {
          return false;
        }

        return leadMatchesSearchQuery(lead, normalizedQuery);
      }),
    }));
  }, [columns, searchQuery, categoryFilter, portalClientView]);

  const filteredTotal = useMemo(
    () => filteredColumns.reduce((sum, column) => sum + column.leads.length, 0),
    [filteredColumns],
  );

  const dialableVisible = useMemo(
    () =>
      filteredColumns
        .flatMap((column) => column.leads)
        .filter((lead) => isDialablePhone(lead.phone)),
    [filteredColumns],
  );

  const loadBoard = useCallback(async () => {
    if (!portalClientView && crmDisabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const organizationId =
        clientFilter === "all" ? undefined : clientFilter;
      const board = portalClientView
        ? await clientPortalService.getCrmKanbanBoard()
        : await leadsService.getKanbanBoard(organizationId);
      setColumns(board.columns.length > 0 ? board.columns : emptyColumns());
      setTotal(board.total);
      setCrmMoveZone(portalClientView ? "all" : (board.crmMoveZone ?? "all"));
      setCrmDisabled(false);

      if (portalClientView) {
        const lastSeenAt = getPortalCrmLastSeenAt(user?.id);
        setNewSdrLeadCount(
          countNewPortalSdrLeads(board.columns, lastSeenAt),
        );
        setSdrBannerDismissed(false);
      }
    } catch (error) {
      if (!portalClientView && isCrmDisabledApiError(error)) {
        setCrmDisabled(true);
        setColumns(emptyColumns());
        setTotal(0);
        return;
      }

      setColumns(emptyColumns());
      setTotal(0);
      setCrmMoveZone("all");
      setNewSdrLeadCount(0);
    } finally {
      setLoading(false);
    }
  }, [clientFilter, crmDisabled, portalClientView, user?.id]);

  const loadReminders = useCallback(async () => {
    if (portalClientView) return;
    try {
      const board = await leadsService.getReminderBoard();
      setReminderBoard(board.columns.length > 0 ? board : emptyReminderBoard());
    } catch {
      setReminderBoard(emptyReminderBoard());
    }
  }, [portalClientView]);

  useEffect(() => {
    void loadBoard();
    void loadReminders();
  }, [loadBoard, loadReminders]);

  useEffect(() => {
    if (portalClientView || !initialOrganizationId) {
      return;
    }

    let cancelled = false;

    void organizationsService
      .getOrganization(initialOrganizationId)
      .then((organization) => {
        if (cancelled) return;
        if (!organization.hasCrmEnabled || !organization.isActive) {
          setCrmDisabled(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCrmDisabled(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialOrganizationId, portalClientView]);

  function handleDismissSdrBanner() {
    markPortalCrmSeenNow(user?.id);
    setSdrBannerDismissed(true);
    setNewSdrLeadCount(0);
  }

  function updateLeadInColumns(leadId: string, patch: Partial<Lead>) {
    setColumns((current) =>
      current.map((column) => ({
        ...column,
        leads: column.leads.map((lead) =>
          lead.id === leadId ? { ...lead, ...patch } : lead,
        ),
      })),
    );
  }

  function applyOptimisticMove(
    leadId: string,
    toColumnKey: string,
    toIndex: number,
  ) {
    setColumns((current) => {
      const moving = current
        .flatMap((column) => column.leads)
        .find((lead) => lead.id === leadId);
      if (!moving) return current;

      const without = current.map((column) => ({
        ...column,
        leads: column.leads.filter((lead) => lead.id !== leadId),
      }));

      const target = current.find(
        (column) => leadColumnKey(column) === toColumnKey,
      );
      const autoMinimize = shouldLeadAutoMinimize(
        target?.status ?? moving.status,
      );

      return without.map((column) => {
        if (leadColumnKey(column) !== toColumnKey) return column;
        const nextLeads = [...column.leads];
        nextLeads.splice(toIndex, 0, {
          ...moving,
          status: (target?.status as Lead["status"]) ?? moving.status,
          stageId: target?.stageId ?? moving.stageId,
          kanbanOrder: toIndex,
          statusLabel: target?.title ?? moving.statusLabel,
          statusColor: target?.color ?? moving.statusColor,
          isMinimized: autoMinimize ? true : moving.isMinimized,
        });
        return { ...column, leads: nextLeads };
      });
    });
  }

  async function persistStatus(
    leadId: string,
    column: LeadKanbanColumn | undefined,
    order?: number,
  ) {
    try {
      const payload = {
        status: column?.status,
        stageId: column?.stageId,
        order,
      };
      const updated = portalClientView
        ? await clientPortalService.updatePortalLeadStage(leadId, payload)
        : await leadsService.updateLeadStatus(leadId, payload);
      updateLeadInColumns(leadId, updated);
    } catch {
      await loadBoard();
      toast.error("Não foi possível atualizar o status do lead.");
    }
  }

  function isCardDragDisabled(lead: Lead): boolean {
    if (dragDisabled) return true;
    if (portalClientView) return false;
    return !canMoveLeadToColumn(crmMoveZone, lead.status);
  }

  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const column = columns.find(
      (item) => leadColumnKey(item) === destination.droppableId,
    );
    const sourceColumn = columns.find(
      (item) => leadColumnKey(item) === source.droppableId,
    );

    if (!column || !sourceColumn) {
      toast.error("Você não pode mover leads para esta coluna.");
      return;
    }

    if (
      !portalClientView &&
      (!canMoveLeadToColumn(crmMoveZone, sourceColumn.status) ||
        !canMoveLeadToColumn(crmMoveZone, column.status))
    ) {
      toast.error("Você não pode mover leads para esta coluna.");
      return;
    }

    applyOptimisticMove(draggableId, destination.droppableId, destination.index);
    await persistStatus(draggableId, column, destination.index);
  }

  async function handleStatusChange(leadId: string, columnKey: string) {
    const column = columns.find((item) => leadColumnKey(item) === columnKey);
    const lead = columns
      .flatMap((col) => col.leads)
      .find((item) => item.id === leadId);
    if (!column || !lead) {
      toast.error("Você não pode mover leads para esta coluna.");
      return;
    }

    if (
      !portalClientView &&
      (!canMoveLeadToColumn(crmMoveZone, lead.status) ||
        !canMoveLeadToColumn(crmMoveZone, column.status))
    ) {
      toast.error("Você não pode mover leads para esta coluna.");
      return;
    }

    applyOptimisticMove(leadId, columnKey, 0);
    await persistStatus(leadId, column, 0);
    toast.success("Lead movido");
  }

  async function handleCollapseChange(leadId: string, isMinimized: boolean) {
    updateLeadInColumns(leadId, { isMinimized });

    try {
      const updated = portalClientView
        ? await clientPortalService.togglePortalLeadCollapse(leadId, isMinimized)
        : await leadsService.toggleLeadCollapse(leadId, isMinimized);
      updateLeadInColumns(leadId, updated);
    } catch {
      await loadBoard();
      toast.error("Não foi possível atualizar a visualização do lead.");
    }
  }

  function removeLeadFromColumns(leadId: string) {
    setColumns((current) =>
      current.map((column) => ({
        ...column,
        leads: column.leads.filter((lead) => lead.id !== leadId),
      })),
    );
    setTotal((current) => Math.max(0, current - 1));
  }

  async function handleRemoveLead(leadId: string) {
    removeLeadFromColumns(leadId);

    if (selectedLead?.id === leadId) {
      setDetailOpen(false);
      setSelectedLead(null);
    }

    try {
      await leadsService.removeFromKanban(leadId);
      toast.success("Lead removido do funil");
    } catch {
      await loadBoard();
      toast.error("Não foi possível remover o lead do funil.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
      </div>
    );
  }

  if (!portalClientView && crmDisabled) {
    return <CrmDisabledEmptyState />;
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div data-tour={portalClientView ? "portal-crm-header" : undefined}>
          <h1 className="text-xl font-bold text-[var(--atria-primary)] sm:text-2xl">
            {view === "reminders"
              ? "Lembretes CRM"
              : portalClientView
                ? "Funil Comercial"
                : "Leads Kanban"}
          </h1>
          <p className="mt-1 text-sm text-[var(--atria-primary)]/50">
            {view === "reminders"
              ? `${reminderBoard.total} lembrete${reminderBoard.total === 1 ? "" : "s"} de follow-up`
              : hasActiveFilters
                ? `${filteredTotal} de ${total} lead${total === 1 ? "" : "s"} no quadro`
                : portalClientView
                  ? `Acompanhe seus leads · ${total} no quadro`
                  : `Acompanhe o funil comercial · ${total} lead${total === 1 ? "" : "s"} no quadro`}
          </p>
        </div>
        {!portalClientView && (
          <div className="flex flex-wrap gap-2">
            {view === "funnel" && (
              <>
                {!portalClientView && dialer && dialableVisible.length > 0 && (
                  <NativeTelButton
                    phone={
                      dialer.mode === "native" &&
                      (dialer.status === "idle" || dialer.queue.length === 0)
                        ? dialableVisible[0]?.phone
                        : null
                    }
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      dialer.enqueue(
                        dialableVisible.map((lead) => ({
                          id: lead.id,
                          name: lead.name,
                          phone: lead.phone as string,
                        })),
                      )
                    }
                  >
                    <Phone className="size-3.5" />
                    Discar {dialableVisible.length} visíveis
                  </NativeTelButton>
                )}
                <LeadKanbanImportDialog onSuccess={() => void loadBoard()} />
                <LeadKanbanFormDialog onSuccess={() => void loadBoard()} />
              </>
            )}
            <div className="flex rounded-lg border border-[var(--atria-primary)]/15 p-0.5">
              <Button
                type="button"
                variant={view === "funnel" ? "default" : "ghost"}
                size="sm"
                className={
                  view === "funnel"
                    ? "bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]/90"
                    : "text-[var(--atria-primary)]"
                }
                onClick={() => setView("funnel")}
              >
                Funil
              </Button>
              <Button
                type="button"
                variant={view === "reminders" ? "default" : "ghost"}
                size="sm"
                className={
                  view === "reminders"
                    ? "bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]/90"
                    : "text-[var(--atria-primary)]"
                }
                onClick={() => {
                  setView("reminders");
                  void loadReminders();
                }}
              >
                <Bell className="size-3.5" />
                Lembretes
                {pendingReminders > 0 && (
                  <span className="ml-1 rounded-full bg-[var(--atria-accent)] px-1.5 text-[10px] font-semibold text-[var(--atria-primary)]">
                    {pendingReminders}
                  </span>
                )}
              </Button>
            </div>
            {isMasterOrAdmin() && (
              <LeadFunnelSettingsDrawer
                onStagesChange={() => {
                  void loadBoard();
                }}
              />
            )}
          </div>
        )}
      </div>

      {portalClientView && !sdrBannerDismissed && (
        <PortalCrmSdrLeadsBanner
          count={newSdrLeadCount}
          onDismiss={handleDismissSdrBanner}
        />
      )}

      {showClientFilter && organizations.length > 0 && (
        <Card className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white shadow-sm">
          <CardContent className="pt-6">
            <Field>
              <FieldLabel htmlFor="kanban-client-filter">
                Filtrar por Cliente
              </FieldLabel>
              <Select
                value={clientFilter}
                onValueChange={(value) => {
                  if (value) {
                    setCrmDisabled(false);
                    setClientFilter(value);
                  }
                }}
                disabled={organizationsLoading}
              >
                <SelectTrigger
                  id="kanban-client-filter"
                  className="h-11 w-full max-w-md text-sm font-medium"
                >
                  <SelectValue placeholder={allClientsLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{allClientsLabel}</SelectItem>
                  {organizations.map((organization) => (
                    <SelectItem key={organization.id} value={organization.id}>
                      {organization.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>
      )}

      {view === "reminders" && !portalClientView ? (
        <CrmReminderKanban
          board={reminderBoard}
          onBoardChange={setReminderBoard}
        />
      ) : (
        <>
          {!portalClientView && (
            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--atria-primary)]/40" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar por nome, telefone, cidade, endereço..."
                  className="pl-9"
                />
              </div>
              <Select
                value={categoryFilter}
                onValueChange={(value) => {
                  if (value) setCategoryFilter(value);
                }}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!portalClientView && crmMoveZone !== "all" && (
            <p className="text-xs text-[var(--atria-primary)]/45">
              {crmMoveZone === "sdr"
                ? "Você pode mover leads entre pré-venda, apresentação, reunião agendada e aguardando resposta."
                : "Você pode mover leads apenas a partir de venda finalizada."}
            </p>
          )}

          {dragDisabled && hasActiveFilters && (
            <p className="text-xs text-[var(--atria-primary)]/45">
              Arraste e solte desativado enquanto filtros estiverem ativos.
            </p>
          )}

          <DragDropContext onDragEnd={(result) => void handleDragEnd(result)}>
            <div
              className="min-w-0"
              data-tour={portalClientView ? "portal-crm-board" : undefined}
            >
            <KanbanHorizontalScroll>
              {filteredColumns.map((column) => {
                const columnKey = leadColumnKey(column);
                return (
                  <div key={columnKey} className="flex w-72 shrink-0 flex-col">
                    <div
                      className="rounded-t-2xl border border-b-0 px-3 py-2.5"
                      style={{
                        borderColor: `${column.color}40`,
                        backgroundColor: `${column.color}14`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: column.color }}
                          />
                          <h2 className="text-sm font-semibold text-[var(--atria-primary)]">
                            {column.title}
                          </h2>
                          {!portalClientView &&
                            crmMoveZone === "sdr" &&
                            isSdrZoneStatus(column.status) && (
                              <span className="text-[10px] text-[var(--atria-primary)]/45">
                                SDR
                              </span>
                            )}
                          {!portalClientView &&
                            crmMoveZone === "client" &&
                            isClientZoneStatus(column.status) && (
                              <span className="text-[10px] text-[var(--atria-primary)]/45">
                                Cliente
                              </span>
                            )}
                        </div>
                        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-[var(--atria-primary)]/70">
                          {column.leads.length}
                        </span>
                      </div>
                    </div>

                    <Droppable
                      droppableId={columnKey}
                      isDropDisabled={
                        portalClientView
                          ? false
                          : !canMoveLeadToColumn(crmMoveZone, column.status)
                      }
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex min-h-[420px] flex-1 flex-col gap-3 rounded-b-2xl border border-t-0 p-3 transition-colors ${
                            snapshot.isDraggingOver
                              ? "border-[var(--atria-accent)] bg-[var(--atria-accent)]/10"
                              : "border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.02]"
                          }`}
                          style={{
                            borderLeftColor: `${column.color}55`,
                            borderLeftWidth: 2,
                          }}
                        >
                          {column.leads.length === 0 && (
                            <p className="py-8 text-center text-xs text-[var(--atria-primary)]/40">
                              {hasActiveFilters
                                ? "Nenhum lead corresponde aos filtros"
                                : "Arraste leads para cá"}
                            </p>
                          )}

                          {column.leads.map((lead, index) => (
                            <Draggable
                              key={lead.id}
                              draggableId={lead.id}
                              index={index}
                              isDragDisabled={isCardDragDisabled(lead)}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={
                                    dragSnapshot.isDragging
                                      ? "opacity-95 shadow-lg"
                                      : ""
                                  }
                                >
                                  <LeadKanbanCard
                                    lead={lead}
                                    columns={columns}
                                    crmMoveZone={crmMoveZone}
                                    portalClientView={portalClientView}
                                    dragHandleProps={
                                      dragProvided.dragHandleProps as React.HTMLAttributes<HTMLButtonElement>
                                    }
                                    onStatusChange={(id, nextColumnKey) =>
                                      void handleStatusChange(id, nextColumnKey)
                                    }
                                    onCollapseChange={(id, isMinimized) =>
                                      void handleCollapseChange(id, isMinimized)
                                    }
                                    onOpenDetails={(selected) => {
                                      setSelectedLead(selected);
                                      setDetailOpen(true);
                                    }}
                                    onRemove={
                                      portalClientView
                                        ? undefined
                                        : (id) => void handleRemoveLead(id)
                                    }
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </KanbanHorizontalScroll>
            </div>
          </DragDropContext>
        </>
      )}

      <LeadDetailDialog
        lead={selectedLead}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        portalClientView={portalClientView}
      />
    </div>
  );
}
