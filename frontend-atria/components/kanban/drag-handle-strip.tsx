"use client";

import type { ButtonHTMLAttributes } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type DragHandleStripProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export function DragHandleStrip({
  label,
  className,
  ...props
}: DragHandleStripProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "flex w-6 shrink-0 cursor-grab items-center justify-center self-stretch rounded-lg text-[var(--atria-primary)]/35 transition-colors hover:bg-[var(--atria-primary)]/5 hover:text-[var(--atria-primary)]/70 active:cursor-grabbing",
        className,
      )}
      {...props}
    >
      <GripVertical className="size-4" />
    </button>
  );
}
