"use client";

import { PhoneCall } from "lucide-react";
import { describeCallOutcome, type LeadCallTone } from "@/lib/lead-last-call";
import { cn } from "@/lib/utils";
import type { LeadLastCall } from "@/services/types";

const TONE_CLASS: Record<LeadCallTone, string> = {
  answered: "text-emerald-700 dark:text-emerald-300",
  missed: "text-amber-700 dark:text-amber-300",
  pending: "text-[var(--atria-primary)]/55",
};

function formatCallDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LeadLastCallLine({ call }: { call?: LeadLastCall | null }) {
  if (!call) return null;

  const { label, tone } = describeCallOutcome(call.outcome);

  return (
    <p
      className={cn(
        "mt-2 flex min-w-0 items-center gap-1.5 pl-6 text-[11px] font-medium",
        TONE_CLASS[tone],
      )}
    >
      <PhoneCall className="size-3 shrink-0" />
      <span className="truncate">
        {label} · {call.user?.name ?? "—"} · {formatCallDate(call.createdAt)}
      </span>
    </p>
  );
}
