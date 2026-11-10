"use client";

import { ArrowRight, UserPlus, X } from "lucide-react";
import { REVENUE_LABELS, labelFor } from "@/lib/site-leads";
import type { SiteLead } from "@/services/types";

interface SiteLeadToastProps {
    leads: SiteLead[];
    onOpen: () => void;
    onClose: () => void;
}

const MAX_NAMES = 3;

function leadName(lead: SiteLead) {
    return lead.name?.trim() || "Sem nome";
}

function describe(leads: SiteLead[]) {
    if (leads.length === 1) {
        const [lead] = leads;
        return lead.revenue
          ? `${leadName(lead)} · ${labelFor(REVENUE_LABELS, lead.revenue)}`
          : leadName(lead);
    }
    const names = leads.slice(0, MAX_NAMES).map(leadName).join(", ");
    const rest = leads.length - MAX_NAMES;
    return rest > 0 ? `${names} e mais ${rest}` : names;
}

export function SiteLeadToast({ leads, onOpen, onClose }: SiteLeadToastProps) {
  const title =
    leads.length === 1
      ? "Novo lead na Central"
      : `${leads.length} novos leads na Central`;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_-12px_rgba(0,50,50,0.35)] ring-1 ring-[#004949]/10 dark:bg-[var(--card)] dark:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)] dark:ring-white/10">
      <span className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar aviso"
        className="absolute right-2.5 top-2.5 rounded-md p-1 text-[#004949]/40 transition-colors hover:bg-[#004949]/5 hover:text-[#004949] dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <X className="size-3.5" />
      </button>
      <div className="flex gap-3 p-4 pl-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300">
          <UserPlus className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1 pr-4">
          <p className="text-sm font-semibold text-[#063333] dark:text-white">
            {title}
          </p>
          <p className="mt-0.5 truncate text-[13px] text-[#063333]/65 dark:text-white/65">
            {describe(leads)}
          </p>
          <div className="mt-3.5 flex items-center gap-2">
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#004949] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#005f5f] dark:bg-[#E8C39E] dark:text-[#062f2f] dark:hover:bg-[#f0d4b4]"
            >
              Ver leads
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
