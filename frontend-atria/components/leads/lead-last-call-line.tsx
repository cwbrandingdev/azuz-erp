"use client";

import { PhoneCall } from "lucide-react";
import {
  describeCallOutcome,
  describeProspectingLastCall,
  type LeadCallTone,
} from "@/lib/lead-last-call";
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

export function LeadLastCallLine({
  call,
  variant = "kanban",
}: {
  call?: LeadLastCall | null;
  variant?: "kanban" | "prospecting";
}) {
  if (!call) return null;

  const prospecting =
    variant === "prospecting" ? describeProspectingLastCall(call) : null;
  const { label, tone } = prospecting
    ? { label: prospecting.text, tone: prospecting.tone }
    : describeCallOutcome(call.outcome);

  return (
    <p
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-[11px] font-medium",
        variant === "kanban" ? "mt-2 pl-6" : "mt-1",
        TONE_CLASS[tone],
      )}
    >
      <PhoneCall className="size-3 shrink-0" />
      <span className="truncate">
        {prospecting
          ? prospecting.text
          : `${label} · ${call.user?.name ?? "—"} · ${formatCallDate(call.createdAt)}`}
      </span>
    </p>
  );
}
