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

function isColorTaken(color: string, takenColors: string[]) {
  const normalized = color.trim().toUpperCase();
  return takenColors.some(
    (taken) => taken.trim().toUpperCase() === normalized,
  );
}

export function WhatsappSdrColorDialog({
  open,
  onOpenChange,
  saving,
  takenColors = [],
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  takenColors?: string[];
  onSave: (color: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedTaken = selected
    ? isColorTaken(selected, takenColors)
    : false;

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
            const taken = isColorTaken(color, takenColors);
            const active = selected === color && !taken;
            return (
              <button
                key={color}
                type="button"
                aria-label={taken ? `Cor ${color} já em uso` : `Cor ${color}`}
                aria-pressed={active}
                aria-disabled={taken}
                disabled={taken}
                title={taken ? "Já em uso" : undefined}
                onClick={() => {
                  if (!taken) setSelected(color);
                }}
                className={cn(
                  "mx-auto size-10 rounded-full ring-offset-2 transition",
                  taken
                    ? "cursor-not-allowed opacity-30"
                    : active
                      ? "ring-2 ring-slate-900 dark:ring-white"
                      : "hover:scale-105",
                )}
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>
        <p className="text-xs text-slate-500 dark:text-muted-foreground">
          Cores já escolhidas por outros SDRs ficam indisponíveis.
        </p>
        <DialogFooter>
          <Button
            type="button"
            disabled={!selected || selectedTaken || saving}
            onClick={() => {
              if (selected && !isColorTaken(selected, takenColors)) {
                onSave(selected);
              }
            }}
          >
            {saving ? "Salvando..." : "Salvar cor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
