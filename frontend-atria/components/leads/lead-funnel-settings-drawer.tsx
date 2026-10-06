"use client";

import { useEffect, useState } from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { GripVertical, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useConfirm } from "@/contexts/confirm-context";
import { toast } from "@/lib/toast";
import { ORCAMENTO_STAGE_KEY } from "@/lib/leads-kanban-utils";
import { ApiError, leadsService } from "@/services";
import type { LeadStage } from "@/services/types";

const DEFAULT_COLOR = "#64748B";

function asHexColor(value: string) {
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) return value;
  if (/^#[0-9A-Fa-f]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return DEFAULT_COLOR;
}

interface LeadFunnelSettingsDrawerProps {
  organizationId?: string;
  organizationName?: string;
  onStagesChange: () => void;
}

export function LeadFunnelSettingsDrawer({
  organizationId,
  organizationName,
  onStagesChange,
}: LeadFunnelSettingsDrawerProps) {
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [showOrcamento, setShowOrcamento] = useState(true);
  const [savingOrcamento, setSavingOrcamento] = useState(false);

  async function loadStages() {
    try {
      const [data, settings] = await Promise.all([
        leadsService.listLeadStages(organizationId),
        leadsService.getCrmBoardSettings(organizationId),
      ]);
      setStages([...data].sort((a, b) => a.order - b.order));
      setShowOrcamento(settings.showOrcamento);
    } catch {
      setStages([]);
    }
  }

  useEffect(() => {
    resetForm();
    if (!open) return;
    void loadStages();
  }, [open, organizationId]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setColor(DEFAULT_COLOR);
    setError(null);
  }

  function startEdit(stage: LeadStage) {
    setEditingId(stage.id);
    setName(stage.name);
    setColor(asHexColor(stage.color || DEFAULT_COLOR));
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    try {
      if (editingId) {
        await leadsService.updateLeadStage(editingId, {
          name: trimmed,
          color,
        });
        toast.success("Estágio atualizado");
      } else {
        await leadsService.createLeadStage({
          name: trimmed,
          color,
          ...(organizationId ? { organizationId } : {}),
        });
        toast.success("Estágio adicionado ao funil");
      }
      resetForm();
      await loadStages();
      onStagesChange();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o estágio.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(stage: LeadStage) {
    const confirmed = await confirm({
      title: "Excluir estágio",
      description: `Remover "${stage.name}" do funil? Os leads deste estágio serão movidos para o primeiro estágio restante.`,
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      await leadsService.deleteLeadStage(stage.id);
      if (editingId === stage.id) resetForm();
      await loadStages();
      onStagesChange();
      toast.success("Estágio removido");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir o estágio.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleOrcamentoToggle(checked: boolean) {
    const previous = showOrcamento;
    setShowOrcamento(checked);
    setSavingOrcamento(true);
    try {
      const updated = await leadsService.updateCrmBoardSettings({
        showOrcamento: checked,
        ...(organizationId ? { organizationId } : {}),
      });
      setShowOrcamento(updated.showOrcamento);
      onStagesChange();
      toast.success(
        updated.showOrcamento
          ? "Coluna de orçamento visível"
          : "Coluna de orçamento ocultada",
      );
    } catch (err) {
      setShowOrcamento(previous);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar a coluna de orçamento.",
      );
    } finally {
      setSavingOrcamento(false);
    }
  }

  async function handleDragEnd(result: DropResult) {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.index === source.index) return;

    const next = [...stages];
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    setStages(next);

    try {
      const updated = await leadsService.reorderLeadStages(
        next.map((stage) => stage.id),
        organizationId,
      );
      setStages([...updated].sort((a, b) => a.order - b.order));
      onStagesChange();
    } catch {
      await loadStages();
      toast.error("Não foi possível reordenar o funil.");
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <SheetTrigger
        render={
          <Button variant="outline" className="border-[var(--atria-primary)]/20" />
        }
      >
        <Settings2 className="size-4" />
        Personalizar colunas
      </SheetTrigger>

      <SheetContent className="w-full overflow-y-auto px-6 pb-6 sm:max-w-md">
        <SheetHeader className="px-0">
          <SheetTitle className="text-[var(--atria-primary)]">
            {organizationName
              ? `Colunas de ${organizationName}`
              : "Funil padrão"}
          </SheetTitle>
          <SheetDescription>
            {organizationName
              ? `Adicione, renomeie, recolora e reordene as colunas apenas deste cliente. Os demais clientes mantêm o próprio funil.`
              : "Este é o funil padrão, usado na visão de todos os clientes e como modelo inicial. Selecione um cliente no filtro para personalizar as colunas só daquele cliente."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-6">
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="rounded-2xl border border-[var(--atria-primary)]/10 bg-[var(--atria-accent)]/5 p-4"
          >
            <h3 className="mb-3 text-sm font-semibold text-[var(--atria-primary)]">
              {editingId ? "Editar estágio" : "Novo estágio"}
            </h3>

            {error && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="stage-name">Nome</FieldLabel>
                <Input
                  id="stage-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ex.: Negociação"
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Cor</FieldLabel>
                <ColorPicker value={color} onChange={setColor} />
              </Field>
            </FieldGroup>

            <div className="mt-4 flex gap-2">
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
              <Button
                type="submit"
                disabled={loading || !name.trim()}
                className="bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]/90"
              >
                <Plus className="size-4" />
                {editingId ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </form>

          <section className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--atria-primary)]">
                  Orçamento
                </h3>
                <p className="mt-1 text-xs text-[var(--atria-primary)]/55">
                  Mostra a coluna Orçamento no funil. Os valores e a soma
                  aparecem só nela.
                </p>
              </div>
              <Switch
                id="toggle-orcamento-column"
                checked={showOrcamento}
                disabled={savingOrcamento}
                onCheckedChange={(checked) =>
                  void handleOrcamentoToggle(checked)
                }
              />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-[var(--atria-primary)]">
              Colunas do funil
            </h3>
            {stages.length === 0 ? (
              <p className="text-sm text-[var(--atria-primary)]/50">
                Nenhum estágio cadastrado.
              </p>
            ) : (
              <DragDropContext onDragEnd={(result) => void handleDragEnd(result)}>
                <Droppable droppableId="lead-funnel-stages">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex flex-col gap-2"
                    >
                      {stages.map((stage, index) => (
                        <Draggable
                          key={stage.id}
                          draggableId={stage.id}
                          index={index}
                        >
                          {(dragProvided, snapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={`flex items-center gap-2 rounded-xl border border-[var(--atria-primary)]/10 bg-white p-3 ${
                                snapshot.isDragging ? "shadow-md" : ""
                              }`}
                            >
                              <button
                                type="button"
                                className="cursor-grab text-[var(--atria-primary)]/35 hover:text-[var(--atria-primary)]/70 active:cursor-grabbing"
                                aria-label={`Reordenar ${stage.name}`}
                                {...dragProvided.dragHandleProps}
                              >
                                <GripVertical className="size-4" />
                              </button>
                              <span
                                className="size-3 shrink-0 rounded-full"
                                style={{ backgroundColor: stage.color }}
                              />
                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--atria-primary)]">
                                {stage.name}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => startEdit(stage)}
                                aria-label={`Renomear ${stage.name}`}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                disabled={
                                  stages.length <= 1 ||
                                  loading ||
                                  stage.key === ORCAMENTO_STAGE_KEY
                                }
                                onClick={() => void handleDelete(stage)}
                                aria-label={`Excluir ${stage.name}`}
                              >
                                <Trash2 className="size-4 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
