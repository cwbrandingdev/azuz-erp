"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getLeadCnaeLabel } from "@/lib/lead-map-utils";
import type { Lead } from "@/services/types";

interface LeadCategoryTextProps {
  lead: Pick<Lead, "category" | "rawData">;
  className?: string;
  primaryClassName?: string;
  emptyLabel?: string;
}

export function LeadCategoryText({
  lead,
  className,
  primaryClassName,
  emptyLabel = "—",
}: LeadCategoryTextProps) {
  const fullCategory =
    getLeadCnaeLabel(lead as Lead) ?? lead.category?.trim() ?? "";
  const hasCategory = Boolean(fullCategory);

  if (!hasCategory) {
    return (
      <span className={cn("text-[var(--atria-primary)]/45", className)}>
        {emptyLabel}
      </span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <div
              className={cn(
                "min-w-0 max-w-full cursor-default text-left",
                className,
              )}
            />
          }
        >
          <p
            className={cn(
              "min-w-0 truncate text-sm text-[var(--atria-primary)]/70",
              primaryClassName,
            )}
          >
            {fullCategory}
          </p>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs break-words text-left">
          {fullCategory}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
