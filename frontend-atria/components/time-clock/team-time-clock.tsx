"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TimeClockEntryDialog } from "@/components/time-clock/time-clock-entry-dialog";
import { WorkDayList } from "@/components/time-clock/work-day-list";
import { useTeamTimeClock } from "@/hooks/use-time-clock";
import {
  formatRangeDay,
  formatWorkedMinutes,
  todayDayKey,
} from "@/lib/time-clock-format";
import { cn } from "@/lib/utils";
import type {
  TeamTimeClockMember,
  TimeClockEntry,
} from "@/services/types";

interface DialogState {
  open: boolean;
  entry: TimeClockEntry | null;
}

export function TeamTimeClock() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    entry: null,
  });

  const { data, isLoading } = useTeamTimeClock({
    from: from || undefined,
    to: to || undefined,
  });

  const members = data?.users ?? [];
  const memberOptions = members.map((member) => member.user);
  const workingNowCount = members.filter(
    (member) => member.status === "WORKING",
  ).length;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--atria-primary)]/50">
            {data
              ? `${formatRangeDay(data.range.from)} a ${formatRangeDay(data.range.to)} · ${workingNowCount} trabalhando agora`
              : "Marcações de todos os colaboradores."}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <Field className="w-40">
            <FieldLabel htmlFor="time-clock-from">De</FieldLabel>
            <Input
              id="time-clock-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Field>
          <Field className="w-40">
            <FieldLabel htmlFor="time-clock-to">Até</FieldLabel>
            <Input
              id="time-clock-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDialog({ open: true, entry: null })}
          >
            <Plus className="size-4" />
            Adicionar marcação
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 bg-white/60 px-6 py-10 text-center text-sm text-[var(--atria-primary)]/50">
          Carregando...
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {members.map((member) => (
            <TeamMemberRow
              key={member.user.id}
              member={member}
              onEditEntry={(entry) => setDialog({ open: true, entry })}
            />
          ))}
        </ul>
      )}

      <TimeClockEntryDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        members={memberOptions}
        entry={dialog.entry}
      />
    </section>
  );
}

function TeamMemberRow({
  member,
  onEditEntry,
}: {
  member: TeamTimeClockMember;
  onEditEntry: (entry: TimeClockEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const missingOutCount = member.days.filter(
    (day) => day.isOpen && day.date !== todayDayKey(),
  ).length;

  return (
    <li className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-[var(--atria-primary)]">
            {member.user.name}
          </span>
          {member.status === "WORKING" ? (
            <Badge variant="success">Trabalhando</Badge>
          ) : null}
          {member.status === "ON_BREAK" ? (
            <Badge variant="warning">No almoço</Badge>
          ) : null}
          {missingOutCount > 0 ? (
            <Badge variant="destructive">
              {missingOutCount} {missingOutCount === 1 ? "dia" : "dias"} sem saída
            </Badge>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm font-semibold text-[var(--atria-primary)]">
            {formatWorkedMinutes(member.totalMinutes)}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-[var(--atria-primary)]/50 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-[var(--atria-primary)]/10 px-5 py-4">
          <WorkDayList
            days={member.days}
            todayKey={todayDayKey()}
            emptyMessage="Nenhuma marcação no período."
            onEditEntry={onEditEntry}
          />
        </div>
      ) : null}
    </li>
  );
}
