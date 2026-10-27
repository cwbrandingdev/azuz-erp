"use client";

import Link from "next/link";
import { ArrowRight, ListTodo, Video } from "lucide-react";
import type { DashboardOverview } from "@/services/types";

interface DashboardFocusProps {
  data: DashboardOverview;
}

function formatMeetingTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "--:--";
  }
}

export function DashboardFocus({ data }: DashboardFocusProps) {
  const meetings = data.calendar.todayMeetings.slice(0, 4);
  const tasks = data.kanban.myTasks.slice(0, 5);

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <div className="rounded-2xl border border-[var(--atria-primary)]/8 bg-white p-5 shadow-sm shadow-[var(--atria-primary)]/5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-800">
              <Video className="size-4" />
            </span>
            <div>
              <h3 className="font-semibold text-[var(--atria-primary)]">
                Hoje na agenda
              </h3>
              <p className="text-xs text-[var(--atria-primary)]/45">
                Próximos compromissos
              </p>
            </div>
          </div>
          <Link
            href="/calendar"
            prefetch={false}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--atria-primary)]/60 transition-colors hover:text-[var(--atria-primary)]"
          >
            Ver agenda
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {meetings.length === 0 ? (
          <p className="rounded-xl bg-[var(--atria-base)] px-4 py-6 text-center text-sm text-[var(--atria-primary)]/45">
            Nenhuma reunião marcada para hoje. Aproveite o foco.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {meetings.map((meeting) => (
              <li
                key={meeting.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--atria-primary)]/6 px-3 py-2.5"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: meeting.color || "var(--atria-accent)" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--atria-primary)]">
                    {meeting.title}
                  </p>
                  <p className="text-xs text-[var(--atria-primary)]/45">
                    {formatMeetingTime(meeting.startAt)} –{" "}
                    {formatMeetingTime(meeting.endAt)}
                  </p>
                </div>
                {meeting.isPending && (
                  <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    Pendente
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--atria-primary)]/8 bg-white p-5 shadow-sm shadow-[var(--atria-primary)]/5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-800">
              <ListTodo className="size-4" />
            </span>
            <div>
              <h3 className="font-semibold text-[var(--atria-primary)]">
                Suas tarefas
              </h3>
              <p className="text-xs text-[var(--atria-primary)]/45">
                Atribuídas a você
              </p>
            </div>
          </div>
          <Link
            href="/kanban"
            prefetch={false}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--atria-primary)]/60 transition-colors hover:text-[var(--atria-primary)]"
          >
            Abrir kanban
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {tasks.length === 0 ? (
          <p className="rounded-xl bg-[var(--atria-base)] px-4 py-6 text-center text-sm text-[var(--atria-primary)]/45">
            Nenhuma tarefa atribuída a você no momento.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="rounded-xl border border-[var(--atria-primary)]/6 px-3 py-2.5"
              >
                <p className="truncate text-sm font-medium text-[var(--atria-primary)]">
                  {task.title}
                </p>
                <p className="text-xs text-[var(--atria-primary)]/45">
                  {task.column}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
