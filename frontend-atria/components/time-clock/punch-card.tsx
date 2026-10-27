"use client";

import { Coffee, Loader2, LogIn, LogOut, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatPunchTime,
  formatWorkedMinutes,
} from "@/lib/time-clock-format";
import type { TimeClockDay, TimeClockEntryType } from "@/services/types";

interface PunchAction {
  label: string;
  icon: LucideIcon;
  className: string;
}

const PRIMARY_CLASS_NAME =
  "bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]/90";

const PUNCH_ACTIONS: Record<TimeClockEntryType, PunchAction> = {
  IN: { label: "Registrar entrada", icon: LogIn, className: PRIMARY_CLASS_NAME },
  BREAK_START: {
    label: "Saída para almoço",
    icon: Coffee,
    className:
      "border-[var(--atria-primary)]/20 bg-white text-[var(--atria-primary)] hover:bg-[var(--atria-accent)]/20",
  },
  BREAK_END: {
    label: "Volta do almoço",
    icon: LogIn,
    className: PRIMARY_CLASS_NAME,
  },
  OUT: {
    label: "Registrar saída",
    icon: LogOut,
    className: "bg-red-600 text-white hover:bg-red-600/90",
  },
};

const STATUS_PREFIX: Record<TimeClockEntryType, string> = {
  IN: "Trabalhando desde",
  BREAK_START: "No almoço desde",
  BREAK_END: "De volta do almoço desde",
  OUT: "Última saída às",
};

interface PunchCardProps {
  today: TimeClockDay | undefined;
  allowedTypes: TimeClockEntryType[];
  pendingType: TimeClockEntryType | null;
  disabled: boolean;
  onPunch: (type: TimeClockEntryType) => void;
}

function describeStatus(today: TimeClockDay | undefined): string {
  const lastEntry = today?.entries.at(-1);
  if (!lastEntry) return "Você ainda não bateu o ponto hoje.";
  return `${STATUS_PREFIX[lastEntry.type]} ${formatPunchTime(lastEntry.punchedAt)}.`;
}

export function PunchCard({
  today,
  allowedTypes,
  pendingType,
  disabled,
  onPunch,
}: PunchCardProps) {
  const breakMinutes = today?.breakMinutes ?? 0;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--atria-primary)]/50">
          Hoje
        </span>
        <span className="text-3xl font-bold text-[var(--atria-primary)]">
          {formatWorkedMinutes(today?.workedMinutes ?? 0)}
        </span>
        <span className="text-sm text-[var(--atria-primary)]/60">
          {describeStatus(today)}
          {breakMinutes > 0
            ? ` Almoço: ${formatWorkedMinutes(breakMinutes)}.`
            : null}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {allowedTypes.map((type) => {
          const action = PUNCH_ACTIONS[type];
          const Icon = pendingType === type ? Loader2 : action.icon;
          return (
            <Button
              key={type}
              type="button"
              size="lg"
              variant={type === "BREAK_START" ? "outline" : "default"}
              onClick={() => onPunch(type)}
              disabled={disabled}
              className={`h-12 px-6 text-base ${action.className}`}
            >
              <Icon
                className={
                  pendingType === type ? "size-5 animate-spin" : "size-5"
                }
              />
              {action.label}
            </Button>
          );
        })}
      </div>
    </section>
  );
}
