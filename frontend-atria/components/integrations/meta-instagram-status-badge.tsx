import type { TaskMetaInstagramState } from "@/services/types";

const LABELS: Record<TaskMetaInstagramState["status"], string> = {
  not_scheduled: "Instagram: não agendado",
  pending: "Instagram: agendando…",
  scheduled: "Instagram: agendado",
  published: "Instagram: publicado",
  failed: "Instagram: falha ao agendar",
};

const STYLES: Record<TaskMetaInstagramState["status"], string> = {
  not_scheduled: "bg-slate-100 text-slate-700",
  pending: "bg-amber-100 text-amber-900",
  scheduled: "bg-emerald-100 text-emerald-900",
  published: "bg-emerald-100 text-emerald-900",
  failed: "bg-red-100 text-red-800",
};

export function MetaInstagramStatusBadge({
  state,
}: {
  state: TaskMetaInstagramState | null | undefined;
}) {
  if (!state || state.status === "not_scheduled") {
    return null;
  }

  return (
    <div className="space-y-1">
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STYLES[state.status]}`}
      >
        {LABELS[state.status]}
        {state.scheduledAt && state.status === "scheduled"
          ? ` · ${new Date(state.scheduledAt).toLocaleString("pt-BR")}`
          : null}
      </span>
      {state.error ? (
        <p className="text-xs text-red-700">{state.error}</p>
      ) : null}
      {state.permalink ? (
        <a
          href={state.permalink}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-[var(--atria-primary)] underline"
        >
          Ver no Instagram
        </a>
      ) : null}
    </div>
  );
}
