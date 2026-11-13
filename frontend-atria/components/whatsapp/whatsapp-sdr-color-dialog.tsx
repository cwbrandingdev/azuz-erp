"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const SDR_INBOX_COLORS = [
  "#2563EB",
  "#16A34A",
  "#DC2626",
  "#D97706",
  "#7C3AED",
  "#DB2777",
  "#0891B2",
  "#EA580C",
  "#4F46E5",
  "#0F766E",
  "#BE123C",
  "#65A30D",
] as const;

export function WhatsappSdrColorDialog({
  open,
  onOpenChange,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  onSave: (color: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelected(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escolha sua cor</DialogTitle>
          <DialogDescription>
            Essa cor identifica você na lista de conversas. Quando você assumir
            um lead, o contato passa a usar essa cor para todos os SDRs.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          {SDR_INBOX_COLORS.map((color) => {
            const active = selected === color;
            return (
              <button
                key={color}
                type="button"
                aria-label={`Cor ${color}`}
                aria-pressed={active}
                onClick={() => setSelected(color)}
                className={cn(
                  "mx-auto size-10 rounded-full ring-offset-2 transition",
                  active
                    ? "ring-2 ring-slate-900 dark:ring-white"
                    : "hover:scale-105",
                )}
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={!selected || saving}
            onClick={() => {
              if (selected) onSave(selected);
            }}
          >
            {saving ? "Salvando..." : "Salvar cor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
