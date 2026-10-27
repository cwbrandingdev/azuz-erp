"use client";

import { Clock } from "lucide-react";
import { PunchCard } from "@/components/time-clock/punch-card";
import { TeamTimeClockSection } from "@/components/time-clock/team-time-clock-section";
import { WorkDayList } from "@/components/time-clock/work-day-list";
import { useAuth } from "@/contexts/auth-context";
import { useMyTimeClock, useTimeClockMutations } from "@/hooks/use-time-clock";
import { canManageTimeClock } from "@/lib/roles";
import {
  formatPunchTime,
  formatWorkedMinutes,
  TIME_CLOCK_TYPE_LABELS,
  todayDayKey,
} from "@/lib/time-clock-format";
import { toast } from "@/lib/toast";
import type { TimeClockEntryType } from "@/services/types";

export function TimeClockPanel() {
  const { user } = useAuth();
  const { data, isLoading } = useMyTimeClock();
  const { punch } = useTimeClockMutations();

  const todayKey = todayDayKey();
  const today = data?.days.find((day) => day.date === todayKey);

  async function handlePunch(type: TimeClockEntryType) {
    try {
      const entry = await punch.mutateAsync(type);
      toast.success(
        `${TIME_CLOCK_TYPE_LABELS[entry.type]} registrada às ${formatPunchTime(entry.punchedAt)}.`,
      );
    } catch {
      // API errors are already surfaced as toasts by apiRequest.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-[var(--atria-primary)]/10 bg-[var(--atria-accent)]/20 p-3 text-[var(--atria-primary)]">
          <Clock className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
            Ponto
          </h1>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Registre sua entrada, a saída e a volta do almoço, e a saída no
            fim do dia.
          </p>
        </div>
      </div>

      <PunchCard
        today={today}
        allowedTypes={data?.allowedTypes ?? ["IN"]}
        pendingType={punch.isPending ? (punch.variables ?? null) : null}
        disabled={punch.isPending || isLoading}
        onPunch={(type) => void handlePunch(type)}
      />

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--atria-primary)]">
            Meu mês
          </h2>
          {data ? (
            <span className="rounded-full bg-[var(--atria-accent)]/30 px-2.5 py-1 text-xs font-semibold text-[var(--atria-primary)]">
              {formatWorkedMinutes(data.totalMinutes)}
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 bg-white/60 px-6 py-10 text-center text-sm text-[var(--atria-primary)]/50">
            Carregando...
          </div>
        ) : (
          <WorkDayList
            days={data?.days ?? []}
            todayKey={todayKey}
            emptyMessage="Nenhuma marcação neste mês."
          />
        )}
      </section>

      {canManageTimeClock(user?.role) ? <TeamTimeClockSection /> : null}
    </div>
  );
}
