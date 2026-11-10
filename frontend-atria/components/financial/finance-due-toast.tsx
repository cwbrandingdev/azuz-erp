"use client";

import { ArrowRight, TriangleAlert, X } from "lucide-react";

interface FinanceDueToastProps {
  dueCount: number;
  overdueCount: number;
  onOpen: () => void;
  onClose: () => void;
}

function plural(count: number, singular: string, pluralWord: string) {
  return `${count} ${count === 1 ? singular : pluralWord}`;
}

function buildMessage(dueCount: number, overdueCount: number) {
  const parts: string[] = [];
  if (dueCount > 0) {
    parts.push(
      `${plural(dueCount, "conta", "contas")} ${dueCount === 1 ? "vence" : "vencem"} hoje`,
    );
  }
  if (overdueCount > 0) {
    parts.push(`${plural(overdueCount, "conta", "contas")} em atraso`);
  }
  return parts.join(" e ");
}

// Toast de contas vencendo/atrasadas: cartão com faixa âmbar, contadores e dois botões.
// No modo escuro o fundo segue a cor de cartão do tema e o botão principal vira
// areia, porque o verde-escuro some sobre o fundo escuro.
export function FinanceDueToast({
  dueCount,
  overdueCount,
  onOpen,
  onClose,
}: FinanceDueToastProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_-12px_rgba(0,50,50,0.35)] ring-1 ring-[#004949]/10 dark:bg-[var(--card)] dark:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)] dark:ring-white/10">
      <span className="absolute inset-y-0 left-0 w-1 bg-amber-400" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar aviso"
        className="absolute right-2.5 top-2.5 rounded-md p-1 text-[#004949]/40 transition-colors hover:bg-[#004949]/5 hover:text-[#004949] dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <X className="size-3.5" />
      </button>
      <div className="flex gap-3 p-4 pl-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
          <TriangleAlert className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1 pr-4">
          <p className="text-sm font-semibold text-[#063333] dark:text-white">
            Atenção ao financeiro
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-[#063333]/65 dark:text-white/65">
            {buildMessage(dueCount, overdueCount)}. Revise e marque os
            pagamentos concluídos.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {dueCount > 0 && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30">
                {dueCount} hoje
              </span>
            )}
            {overdueCount > 0 && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/30">
                {overdueCount} em atraso
              </span>
            )}
          </div>
          <div className="mt-3.5 flex items-center gap-2">
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#004949] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#005f5f] dark:bg-[#E8C39E] dark:text-[#062f2f] dark:hover:bg-[#f0d4b4]"
            >
              Abrir financeiro
              <ArrowRight className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#063333]/55 transition-colors hover:bg-[#004949]/5 hover:text-[#063333] dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white"
            >
              Depois
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
