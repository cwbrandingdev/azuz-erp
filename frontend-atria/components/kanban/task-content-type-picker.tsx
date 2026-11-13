"use client";

import { cn } from "@/lib/utils";
import {
  DEFAULT_OTHER_DELIVERABLE_TYPE,
  DEFAULT_TASK_CONTENT_TYPE,
  getDeliverableFamily,
  OTHER_TASK_CONTENT_TYPE_OPTIONS,
  SOCIAL_TASK_CONTENT_TYPE_OPTIONS,
  type TaskDeliverableFamily,
} from "@/lib/task-content-type";
import type { KanbanTaskContentType } from "@/services/types";

interface TaskContentTypePickerProps {
  value: KanbanTaskContentType;
  onChange: (value: KanbanTaskContentType) => void;
  disabled?: boolean;
}

const FAMILY_OPTIONS: ReadonlyArray<{
  value: TaskDeliverableFamily;
  label: string;
}> = [
  { value: "social", label: "Redes sociais" },
  { value: "other", label: "Outro" },
];

export function TaskContentTypePicker({
  value,
  onChange,
  disabled = false,
}: TaskContentTypePickerProps) {
  const family = getDeliverableFamily(value);
  const options =
    family === "social"
      ? SOCIAL_TASK_CONTENT_TYPE_OPTIONS
      : OTHER_TASK_CONTENT_TYPE_OPTIONS;

  function selectFamily(nextFamily: TaskDeliverableFamily) {
    if (nextFamily === family) return;
    onChange(
      nextFamily === "social"
        ? DEFAULT_TASK_CONTENT_TYPE
        : DEFAULT_OTHER_DELIVERABLE_TYPE,
    );
  }

  return (
    <div className="space-y-2">
      <div role="group" aria-label="Tipo de entrega" className="grid grid-cols-2 gap-2">
        {FAMILY_OPTIONS.map((option) => {
          const selected = family === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => selectFamily(option.value)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                selected
                  ? "border-[var(--atria-primary)] bg-[var(--atria-primary)] text-white shadow-sm"
                  : "border-input text-[var(--atria-primary)] hover:border-[var(--atria-primary)]/25",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div
        role="group"
        aria-label={family === "social" ? "Formato do conteúdo" : "Tipo da entrega"}
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition",
                selected
                  ? "border-[var(--atria-primary)] bg-[var(--atria-primary)]/5 shadow-sm"
                  : "border-input hover:border-[var(--atria-primary)]/25",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <p className="text-sm font-semibold text-[var(--atria-primary)]">
                {option.label}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
