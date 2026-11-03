"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LeadOwnerSelect } from "@/components/leads/lead-owner-select";
import { Field, FieldLabel } from "@/components/ui/field";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { CrmUserOption, Organization } from "@/services/types";

interface AddToKanbanOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: Organization[];
  defaultOrganizationId?: string;
  leadCount?: number;
  loading?: boolean;
  owners?: CrmUserOption[];
  requireOwner?: boolean;
  onConfirm: (organizationId: string, ownerUserId?: string) => void | Promise<void>;
}

export function AddToKanbanOrganizationDialog({
  open,
  onOpenChange,
  organizations,
  defaultOrganizationId = "",
  leadCount = 1,
  loading = false,
  owners = [],
  requireOwner = false,
  onConfirm,
}: AddToKanbanOrganizationDialogProps) {
  const [organizationId, setOrganizationId] = useState(defaultOrganizationId);
  const [ownerUserId, setOwnerUserId] = useState("");

  useEffect(() => {
    if (!open) return;
    setOrganizationId(
      defaultOrganizationId ||
        (organizations.length === 1 ? organizations[0]?.id ?? "" : ""),
    );
    setOwnerUserId("");
  }, [defaultOrganizationId, open, organizations]);

  const title =
    leadCount > 1
      ? `Adicionar ${leadCount} leads ao kanban`
      : "Adicionar ao kanban";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[var(--atria-primary)]">
            {title}
          </DialogTitle>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="kanban-target-organization">
            Para qual cliente é este lead? *
          </FieldLabel>
          <SearchableSelect
            id="kanban-target-organization"
            value={organizationId}
            onValueChange={setOrganizationId}
            placeholder="Selecione o cliente..."
            searchPlaceholder="Buscar cliente..."
            emptyLabel="Nenhum cliente atribuído"
            options={organizations.map((organization) => ({
              value: organization.id,
              label: organization.companyName,
            }))}
          />
        </Field>

        {requireOwner && (
          <LeadOwnerSelect
            id="kanban-target-owner"
            value={ownerUserId}
            onChange={setOwnerUserId}
            owners={owners}
            required
          />
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={
              !organizationId || loading || (requireOwner && !ownerUserId)
            }
            className="bg-[var(--atria-primary)] text-white"
            onClick={() =>
              void onConfirm(organizationId, ownerUserId || undefined)
            }
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Confirmar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
