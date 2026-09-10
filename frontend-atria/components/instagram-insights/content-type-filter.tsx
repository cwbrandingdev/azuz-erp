"use client";

import { TASK_CONTENT_TYPE_OPTIONS } from "@/lib/task-content-type";
import type { InstagramContentType } from "@/services/types";

const FILTERS: Array<{
  value: InstagramContentType | "all";
  label: string;
}> = [
  { value: "all", label: "Todos" },
  ...TASK_CONTENT_TYPE_OPTIONS.map((option) => ({
    value: option.value.toUpperCase() as InstagramContentType,
    label: option.label,
  })),
];

interface ContentTypeFilterProps {
  value: InstagramContentType | "all";
  onChange: (value: InstagramContentType | "all") => void;
}

export function ContentTypeFilter({ value, onChange }: ContentTypeFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => {
        const active = filter.value === value;
        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => onChange(filter.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              active
                ? "bg-[var(--atria-primary)] text-white"
                : "border border-[var(--atria-primary)]/15 bg-white text-[var(--atria-primary)]/70 hover:bg-[var(--atria-accent)]/20"
            }`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}

export function toKanbanContentTypeLabel(
  contentType: InstagramContentType,
): string {
  const match = TASK_CONTENT_TYPE_OPTIONS.find(
    (option) =>
      (option.value.toUpperCase() as InstagramContentType) === contentType,
  );
  return match?.label ?? contentType;
}
