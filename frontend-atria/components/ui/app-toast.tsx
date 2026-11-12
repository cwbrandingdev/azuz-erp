"use client";

import type { ReactNode } from "react";
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AppToastVariant = "success" | "error" | "info" | "warning";

export interface AppToastAction {
  label: string;
  onClick: () => void;
}

interface VariantStyle {
  icon: LucideIcon;
  stripe: string;
  chip: string;
}

const VARIANTS: Record<AppToastVariant, VariantStyle> = {
  success: {
    icon: CircleCheck,
    stripe: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
  error: {
    icon: CircleAlert,
    stripe: "bg-red-500",
    chip: "bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-300",
  },
  info: {
    icon: Info,
    stripe: "bg-[#004949] dark:bg-[#E8C39E]",
    chip: "bg-[#004949]/10 text-[#004949] dark:bg-[#E8C39E]/15 dark:text-[#E8C39E]",
  },
  warning: {
    icon: TriangleAlert,
    stripe: "bg-amber-400",
    chip: "bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300",
  },
};

interface AppToastProps {
  variant: AppToastVariant;
  title: ReactNode;
  description?: ReactNode;
  badges?: ReactNode;
  action?: AppToastAction;
  onClose: () => void;
}

// Etiqueta pequena para contadores dentro do toast (ex.: "2 em atraso").
export function AppToastBadge({
  tone,
  children,
}: {
  tone: "amber" | "red" | "emerald";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
        tone === "amber" &&
          "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30",
        tone === "red" &&
          "bg-red-50 text-red-600 ring-red-200 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/30",
        tone === "emerald" &&
          "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/30",
      )}
    >
      {children}
    </span>
  );
}

// Cartão único de todos os toasts do sistema (padrão do toast do financeiro);
// só a cor e o ícone mudam conforme o tipo.
export function AppToast({
  variant,
  title,
  description,
  badges,
  action,
  onClose,
}: AppToastProps) {
  const { icon: Icon, stripe, chip } = VARIANTS[variant];
  const compact = !description && !badges && !action;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_-12px_rgba(0,50,50,0.35)] ring-1 ring-[#004949]/10 dark:bg-[var(--card)] dark:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)] dark:ring-white/10">
      <span className={cn("absolute inset-y-0 left-0 w-1", stripe)} />
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar aviso"
        className="absolute right-2.5 top-2.5 rounded-md p-1 text-[#004949]/40 transition-colors hover:bg-[#004949]/5 hover:text-[#004949] dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <X className="size-3.5" />
      </button>
      <div className={cn("flex gap-3 p-4 pl-5", compact && "items-center")}>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            chip,
          )}
        >
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1 pr-4">
          <p className="text-sm font-semibold text-[#063333] dark:text-white">
            {title}
          </p>
          {description && (
            <p className="mt-0.5 text-[13px] leading-snug text-[#063333]/65 dark:text-white/65">
              {description}
            </p>
          )}
          {badges && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">{badges}</div>
          )}
          {action && (
            <div className="mt-3.5 flex items-center gap-2">
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#004949] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#005f5f] dark:bg-[#E8C39E] dark:text-[#062f2f] dark:hover:bg-[#f0d4b4]"
              >
                {action.label}
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
          )}
        </div>
      </div>
    </div>
  );
}
