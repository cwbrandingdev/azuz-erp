"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LeadOrganizationSelect,
  resolveOrganizationIdForPayload,
} from "@/components/leads/lead-organization-select";
import { toast } from "@/lib/toast";
import { leadsService } from "@/services";
import type { LeadKanbanColumn, LeadStage } from "@/services/types";

interface LeadKanbanFormDialogProps {
  onSuccess: () => void;
  columns?: LeadKanbanColumn[];
}

const EMPTY_FORM = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  website: "",
  category: "",
  city: "",
  neighborhood: "",
  address: "",
  source: "",
};

export function LeadKanbanFormDialog({
  onSuccess,
  columns = [],
}: LeadKanbanFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [organizationValue, setOrganizationValue] = useState("");
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [stageId, setStageId] = useState("");

  const fallbackColumns = useMemo(
    () =>
      columns
        .filter((column) => Boolean(column.stageId))
        .map((column) => ({
          id: column.stageId as string,
          name: column.title,
          color: column.color,
        })),
    [columns],
  );

  const columnOptions =
    stages.length > 0
      ? stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          color: stage.color,
        }))
      : fallbackColumns;

  const selectedColumn = columnOptions.find((column) => column.id === stageId);

  function updateField(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setOrganizationValue("");
    setStages([]);
    setStageId(fallbackColumns[0]?.id ?? "");
  }

  useEffect(() => {
    if (!open) return;

    const organizationId = resolveOrganizationIdForPayload(organizationValue);
    let cancelled = false;

    void leadsService
      .listLeadStages(organizationId)
      .then((list) => {
        if (cancelled) return;
        const sorted = [...list].sort((a, b) => a.order - b.order);
        setStages(sorted);
        setStageId((current) =>
          sorted.some((stage) => stage.id === current)
            ? current
            : (sorted[0]?.id ?? fallbackColumns[0]?.id ?? ""),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setStages([]);
        setStageId((current) =>
          fallbackColumns.some((column) => column.id === current)
            ? current
            : (fallbackColumns[0]?.id ?? ""),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [open, organizationValue, fallbackColumns]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    if (!name) {
      toast.error("Informe o nome da empresa ou contato.");
      return;
    }

    const organizationId = resolveOrganizationIdForPayload(organizationValue);
    if (!organizationId) {
      toast.error("Selecione a empresa cliente.");
      return;
    }

    if (!stageId) {
      toast.error("Selecione a coluna do kanban.");
      return;
    }

    setLoading(true);
    try {
      await leadsService.addToKanban({
        name,
        contactName: form.contactName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        website: form.website.trim() || undefined,
        category: form.category.trim() || undefined,
        city: form.city.trim() || undefined,
        neighborhood: form.neighborhood.trim() || undefined,
        address: form.address.trim() || undefined,
        source: form.source.trim() || "manual",
        organizationId,
        stageId: stageId || undefined,
      });

      toast.success(`${name} adicionado ao kanban.`);
      resetForm();
      setOpen(false);
      onSuccess();
    } catch {
      /* toast handled by api */
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]/90"
          />
        }
      >
        <UserPlus className="size-4" />
        Novo lead
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[var(--atria-primary)]">
            Adicionar lead manualmente
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
          <FieldGroup>
            <LeadOrganizationSelect
              value={organizationValue}
              onChange={setOrganizationValue}
              id="kanban-lead-organization"
            />
            <Field>
              <FieldLabel htmlFor="kanban-lead-column">Coluna *</FieldLabel>
              <Select
                value={stageId || undefined}
                onValueChange={(next) => {
                  if (next) setStageId(next);
                }}
                disabled={columnOptions.length === 0}
              >
                <SelectTrigger id="kanban-lead-column" className="w-full">
                  {selectedColumn ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: selectedColumn.color }}
                      />
                      <span className="truncate">{selectedColumn.name}</span>
                    </span>
                  ) : (
                    <SelectValue placeholder="Selecione a coluna" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {columnOptions.map((column) => (
                    <SelectItem key={column.id} value={column.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: column.color }}
                        />
                        {column.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="kanban-lead-name">
                Empresa / Nome *
              </FieldLabel>
              <Input
                id="kanban-lead-name"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Ex: Restaurante Exemplo"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="kanban-lead-contact">
                Com quem estamos falando
              </FieldLabel>
              <Input
                id="kanban-lead-contact"
                value={form.contactName}
                onChange={(event) =>
                  updateField("contactName", event.target.value)
                }
                placeholder="Ex.: Maria Silva"
                maxLength={255}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="kanban-lead-phone">Telefone</FieldLabel>
                <Input
                  id="kanban-lead-phone"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="11999998888"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="kanban-lead-email">E-mail</FieldLabel>
                <Input
                  id="kanban-lead-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="contato@empresa.com"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="kanban-lead-website">Website</FieldLabel>
              <Input
                id="kanban-lead-website"
                value={form.website}
                onChange={(event) => updateField("website", event.target.value)}
                placeholder="https://empresa.com"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="kanban-lead-category">Categoria</FieldLabel>
                <Input
                  id="kanban-lead-category"
                  value={form.category}
                  onChange={(event) =>
                    updateField("category", event.target.value)
                  }
                  placeholder="Ex: Restaurante"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="kanban-lead-city">Cidade</FieldLabel>
                <Input
                  id="kanban-lead-city"
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  placeholder="São Paulo"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="kanban-lead-neighborhood">Bairro</FieldLabel>
                <Input
                  id="kanban-lead-neighborhood"
                  value={form.neighborhood}
                  onChange={(event) =>
                    updateField("neighborhood", event.target.value)
                  }
                  placeholder="Pinheiros"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="kanban-lead-address">Endereço</FieldLabel>
                <Input
                  id="kanban-lead-address"
                  value={form.address}
                  onChange={(event) =>
                    updateField("address", event.target.value)
                  }
                  placeholder="Rua Exemplo, 100"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="kanban-lead-source">Origem</FieldLabel>
              <Input
                id="kanban-lead-source"
                value={form.source}
                onChange={(event) => updateField("source", event.target.value)}
                placeholder="Ex.: indicação, Instagram, evento, Google"
                maxLength={255}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[var(--atria-primary)] text-white"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Adicionar ao kanban"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
