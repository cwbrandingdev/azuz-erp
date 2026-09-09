"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

interface RejectPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (rejectionReason: string) => Promise<void>;
  loading?: boolean;
}

export function RejectPostDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: RejectPostDialogProps) {
  const [reason, setReason] = useState("");

  async function handleSubmit() {
    const trimmed = reason.trim();
    if (!trimmed) return;
    await onConfirm(trimmed);
    setReason("");
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) setReason("");
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar ajuste</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="rejection-reason">
              Observações do ajuste
            </FieldLabel>
            <textarea
              id="rejection-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Descreva o que precisa ser ajustado..."
              className="w-full rounded-xl border border-[var(--atria-primary)]/20 bg-white px-3 py-2 text-sm text-[var(--atria-primary)] outline-none focus:border-[var(--atria-primary)]/40"
            />
          </Field>
        </FieldGroup>

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
            variant="destructive"
            onClick={() => void handleSubmit()}
            disabled={loading || !reason.trim()}
          >
            {loading ? "Enviando..." : "Enviar ajuste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
