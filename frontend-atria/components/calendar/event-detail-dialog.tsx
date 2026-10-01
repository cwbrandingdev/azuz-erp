"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventFormDialog } from "@/components/calendar/event-form-dialog";
import {
  canChangeEventProductionPhase,
  CATEGORY_LABELS,
  formatEventClock,
  formatEventDate,
  getEventDeliveryAt,
  getEventDisplayColor,
  getEventProductionPhaseOrDefault,
  getEventPublicationAt,
} from "@/lib/calendar-utils";
import { PRODUCTION_PHASE_DEFINITIONS } from "@/lib/production-phase";
import {
  getCalendarContentTypeLabel,
  getEventContentType,
} from "@/lib/task-content-type";
import { toast } from "@/lib/toast";
import { TaskContentTypeIcon } from "@/components/icons/task-content-type-icon";
import { useUpdateTaskMutation } from "@/hooks/use-task-mutations";
import { calendarService } from "@/services";
import type { CalendarEvent, ProductionPhase } from "@/services/types";

interface EventDetailDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

export function EventDetailDialog({
  event,
  open,
  onOpenChange,
  onDeleted,
  onUpdated,
}: EventDetailDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activePhase, setActivePhase] = useState<ProductionPhase>("roteiro");
  const updateTaskMutation = useUpdateTaskMutation();

  useEffect(() => {
    if (!event) return;
    setActivePhase(getEventProductionPhaseOrDefault(event));
  }, [event]);

  async function handleProductionPhaseChange(phase: ProductionPhase) {
    if (!event?.kanbanTaskId || activePhase === phase) return;

    const previousPhase = activePhase;
    setActivePhase(phase);

    try {
      await updateTaskMutation.mutateAsync({
        taskId: event.kanbanTaskId,
        data: { productionPhase: phase },
      });
      toast.success("Indicador de produção atualizado.");
      onUpdated();
    } catch {
      setActivePhase(previousPhase);
      toast.error("Não foi possível atualizar o indicador de produção.");
    }
  }

  async function handleDelete() {
    if (!event) return;
    setDeleting(true);
    try {
      await calendarService.deleteEvent(event.id);
      toast.success("Evento excluído.");
      onOpenChange(false);
      onDeleted();
    } catch {
      toast.error("Não foi possível excluir o evento.");
    } finally {
      setDeleting(false);
    }
  }

  if (!event) return null;

  const displayColor = getEventDisplayColor(event);
  const publicationAt = getEventPublicationAt(event);
  const deliveryAt = getEventDeliveryAt(event);
  const showProductionPhaseOptions = canChangeEventProductionPhase(event);
  const contentType = getEventContentType(event);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span
                className="mt-1 h-3 w-3 shrink-0 rounded-full shadow-[0_0_10px_currentColor]"
                style={{ backgroundColor: displayColor, color: displayColor }}
              />
              <div className="flex-1">
                <DialogTitle className="flex items-center gap-2 text-[var(--atria-primary)]">
                  {contentType ? (
                    <TaskContentTypeIcon type={contentType} size={18} />
                  ) : null}
                  <span>{event.title}</span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {contentType
                    ? getCalendarContentTypeLabel(contentType)
                    : CATEGORY_LABELS[event.category]}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            {event.client && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Cliente
                </p>
                <Badge
                  className="mt-1 border-0 font-semibold shadow-sm"
                  style={{
                    backgroundColor: `${event.client.color}22`,
                    color: event.client.color,
                  }}
                >
                  {event.client.companyName}
                </Badge>
              </div>
            )}

            {showProductionPhaseOptions && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Status de produção
                </p>
                <div className="flex flex-col gap-2">
                  {PRODUCTION_PHASE_DEFINITIONS.map((phase) => {
                    const isActive = activePhase === phase.phase;

                    return (
                      <button
                        key={phase.phase}
                        type="button"
                        onClick={() => void handleProductionPhaseChange(phase.phase)}
                        disabled={updateTaskMutation.isPending}
                        className="flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors hover:bg-[var(--atria-accent)]/20 disabled:opacity-60"
                        style={{
                          borderColor: `${phase.color}55`,
                          backgroundColor: isActive ? `${phase.color}14` : undefined,
                        }}
                      >
                        <span
                          className="size-3 shrink-0 rounded-full ring-1 ring-black/5"
                          style={{ backgroundColor: phase.color }}
                        />
                        <span className="flex-1 text-sm font-medium text-[var(--atria-primary)]">
                          {phase.label}
                        </span>
                        {isActive && (
                          <Check className="size-4 text-[var(--atria-primary)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-[var(--atria-primary)]/10 bg-[var(--atria-accent)]/15 p-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--atria-primary)]/55">
                  Data de Publicação
                </p>
                <Badge
                  variant="outline"
                  className="border-[var(--atria-primary)]/15 bg-white text-[10px] font-medium text-[var(--atria-primary)]/70"
                >
                  Principal
                </Badge>
              </div>
              <p className="mt-1 font-semibold text-[var(--atria-primary)]">
                {formatEventDate(publicationAt)}
              </p>
              <p className="text-sm text-[var(--atria-primary)]/70">
                {formatEventClock(publicationAt)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Data de Entrega
              </p>
              <p className="text-[var(--atria-primary)]">
                {formatEventDate(deliveryAt)}
              </p>
              <p className="text-sm text-[var(--atria-primary)]/60">
                {formatEventClock(deliveryAt)}
              </p>
            </div>

            {event.description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Descrição
                </p>
                <p className="text-[var(--atria-primary)]/80">
                  {event.description}
                </p>
              </div>
            )}

            {event.assignee && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Responsável
                </p>
                <p className="text-[var(--atria-primary)]">
                  {event.assignee.name}
                </p>
              </div>
            )}

            {event.referenceUrl && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Referência
                </p>
                <a
                  href={event.referenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-medium text-cyan-700 transition-colors hover:bg-cyan-100"
                >
                  <ExternalLink className="size-4" />
                  Abrir Link de Referência
                </a>
              </div>
            )}

            {event.isPending && (
              <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                Pendente
              </span>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-4" />
              Editar
            </Button>

            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EventFormDialog
        event={event}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => {
          setEditOpen(false);
          onOpenChange(false);
          onUpdated();
        }}
      />
    </>
  );
}
