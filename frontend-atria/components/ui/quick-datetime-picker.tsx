"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TIME_SLOTS = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
];

const DEFAULT_TIME = "10:00";

function pad(value: number) {
    return String(value).padStart(2, "0");
}

function toIsoDate(date: Date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(base: Date, days: number) {
    const date = new Date(base);
    date.setDate(date.getDate() + days);
    return date;
}

function describe(date: string, time: string) {
    if (!date || !time) return "";
    const label = new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });
    return `${label} às ${time}`;
}

interface ChipProps {
    label: string;
    selected: boolean;
    disabled?: boolean;
    onClick: () => void;
}

function Chip({ label, selected, disabled, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
        selected
          ? "border-[var(--atria-accent)] bg-[var(--atria-accent)]/15 text-[var(--atria-accent)]"
          : "border-input text-[var(--atria-primary)] hover:bg-[var(--atria-primary)]/5 dark:border-white/12 dark:hover:bg-white/5",
      )}
    >
      {label}
    </button>
  ); 
}

interface QuickDateTimePickerProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
}

export function QuickDateTimePicker({
    id,
    value,
    onChange,
}: QuickDateTimePickerProps) {
    const [date = "", time = ""] = value.split("T");

    const now = new Date();
    const today = toIsoDate(now);
    const tomorrow = toIsoDate(addDays(now, 1));
    const [otherDayOpen, setOtherDayOpen] = useState(false);
    const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const isOtherDay = Boolean(date) && date !== today && date !== tomorrow;
    const showDateField = otherDayOpen || isOtherDay;

    function pickQuickDay(day: string) {
        setOtherDayOpen(false);
        changeDate(day);
    }

    function changeDate(nextDate: string) {
        if (!nextDate) {
            onChange("");
            return;
        }
        onChange(`${nextDate}T${time || DEFAULT_TIME}`);
    }

    function changeTime(nextTime: string) {
        if (!nextTime) return;
        onChange(`${date || today}T${nextTime}`);
    }

    const summary = describe(date, time);

    return (
        <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
            <Chip
                label="Hoje"
                selected={!showDateField && date === today}
                onClick={() => pickQuickDay(today)}
            />
            <Chip
                label="Amanhã"
                selected={!showDateField && date === tomorrow}
                onClick={() => pickQuickDay(tomorrow)}
            />
            <Chip
                label="Escolher outro dia"
                selected={showDateField}
                onClick={() => setOtherDayOpen(true)}
            />
        </div>

        {showDateField ? (
            <Input
                id={id}
                type="date"
                value={date}
                onChange={(event) => changeDate(event.target.value)}
            />
        ) : null}

        <div className="flex flex-wrap gap-2">
            {TIME_SLOTS.map((slot) => (
            <Chip
                key={slot}
                label={slot}
                selected={time === slot}
                disabled={date === today && slot <= currentTime}
                onClick={() => changeTime(slot)}
            />
            ))}
        </div>

        <div className="space-y-1.5">
            <label
            htmlFor={id ? `${id}-time` : undefined}
            className="text-xs font-medium text-[var(--atria-primary)]/65"
            >
            Horário: escolha acima e ajuste se precisar
            </label>
            <Input
            id={id ? `${id}-time` : undefined}
            type="time"
            step={300}
            value={time}
            onChange={(event) => changeTime(event.target.value)}
            />
        </div>

        {summary ? (
            <p className="text-sm font-medium text-[var(--atria-primary)]">
            {summary}
            </p>
        ) : null}
        </div>
    );
}
