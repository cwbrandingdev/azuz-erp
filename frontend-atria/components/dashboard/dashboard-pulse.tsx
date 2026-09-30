"use client";

import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
} from "lucide-react";
import { formatCurrency } from "@/lib/financial-utils";
import type { DashboardOverview } from "@/services/types";
import { cn } from "@/lib/utils";

interface DashboardPulseProps {
  data: DashboardOverview;
}

export function DashboardPulse({ data }: DashboardPulseProps) {
  const meetingsToday = data.calendar.todayMeetings.length;
  const myTasks = data.kanban.myTasks.length;
  const scheduledPosts = data.contentAndMeta.scheduledPosts.length;

  const cards = [
    {
      label: "Resultado líquido",
      value: formatCurrency(data.finance.netProfit),
      hint: "resultado do mês atual",
      href: "/financial",
      icon: CircleDollarSign,
      tone: "text-[var(--atria-primary)] bg-[var(--atria-accent)]/25",
    },
    {
      label: "Reuniões hoje",
      value: String(meetingsToday),
      hint: meetingsToday === 0 ? "agenda livre" : "na sua agenda",
      href: "/calendar",
      icon: CalendarDays,
      tone: "text-sky-800 bg-sky-500/15",
    },
    {
      label: "Minhas tarefas",
      value: String(myTasks),
      hint: myTasks === 0 ? "sem pendências no kanban" : "no seu board",
      href: "/kanban",
      icon: ClipboardList,
      tone: "text-emerald-800 bg-emerald-500/15",
    },
    {
      label: "Posts agendados",
      value: String(scheduledPosts),
      hint: "na fila de conteúdo",
      href: "/creation",
      icon: CheckCircle2,
      tone: "text-violet-800 bg-violet-500/15",
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--atria-primary)]">
          Pulso do dia
        </h2>
        <p className="mt-0.5 text-sm text-[var(--atria-primary)]/50">
          Um olhar rápido sem abrir cada módulo
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className={cn(
                "rounded-2xl border border-[var(--atria-primary)]/8 bg-card p-4",
                "shadow-sm shadow-[var(--atria-primary)]/5 transition-all duration-200",
                "hover:border-[var(--atria-accent)]/35 hover:shadow-md dark:border-white/10 dark:shadow-black/40",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-[var(--atria-primary)]/45 uppercase">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--atria-primary)]">
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-[var(--atria-primary)]/45">
                    {card.hint}
                  </p>
                </div>
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl",
                    card.tone,
                  )}
                >
                  <Icon className="size-5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
