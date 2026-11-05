"use client";

import { useState } from "react";
import { inputClassName } from "@/components/ui/input";
import { resolveMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import type { ProductivityRow } from "@/services/productivity.service";

const SDR_SCORE_KEYS = [
  "calls",
  "messagesSent",
  "leadsOnKanban",
  "meetings",
] as const satisfies ReadonlyArray<keyof ProductivityRow>;

const DESIGNER_SCORE_KEYS = [
  "tasksCreated",
  "uploads",
  "tasksCompleted",
  "comments",
  "clientApprovals",
] as const satisfies ReadonlyArray<keyof ProductivityRow>;

const numberFormat = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

type Mood = "happy" | "sad" | "neutral";

function scoreOf(
  row: ProductivityRow,
  keys: readonly (keyof ProductivityRow)[],
): number {
  return keys.reduce((total, key) => {
    const value = row[key];
    return total + (typeof value === "number" ? value : 0);
  }, 0);
}

function personScore(row: ProductivityRow): number {
  const role = row.role.toLowerCase();
  if (role === "crm") return scoreOf(row, SDR_SCORE_KEYS);
  if (role === "designer_junior" || role === "designer_master") {
    return scoreOf(row, DESIGNER_SCORE_KEYS);
  }
  return scoreOf(row, [...SDR_SCORE_KEYS, ...DESIGNER_SCORE_KEYS]);
}

function roleLabel(role: string): string {
  switch (role.toLowerCase()) {
    case "crm":
      return "CRM / SDR";
    case "designer_master":
      return "Designer Sênior";
    case "designer_junior":
      return "Designer Júnior";
    case "master":
      return "Master";
    default:
      return role;
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

function defaultIds(rows: ProductivityRow[]): { left: string; right: string } {
  const sdr = rows.find((row) => row.role.toLowerCase() === "crm");
  const designer = rows.find((row) =>
    row.role.toLowerCase().startsWith("designer"),
  );
  const left = sdr?.userId ?? rows[0]?.userId ?? "";
  const rightCandidate =
    designer && designer.userId !== left
      ? designer.userId
      : rows.find((row) => row.userId !== left)?.userId;
  return { left, right: rightCandidate ?? "" };
}

export function ProductivityFight({ rows }: { rows: ProductivityRow[] }) {
  const rosterKey = rows.map((row) => row.userId).join("|");
  const [choice, setChoice] = useState<{
    key: string;
    left: string;
    right: string;
  } | null>(null);
  const active =
    choice && choice.key === rosterKey
      ? choice
      : { key: rosterKey, ...defaultIds(rows) };

  const left = rows.find((row) => row.userId === active.left) ?? null;
  const right = rows.find((row) => row.userId === active.right) ?? null;
  const leftScore = left ? personScore(left) : 0;
  const rightScore = right ? personScore(right) : 0;
  const combined = leftScore + rightScore;
  const leftShare = combined === 0 ? 50 : (leftScore / combined) * 100;
  const mood = moodFor(leftScore, rightScore);
  const verdict = verdictFor(left, right, leftScore, rightScore);

  function pick(side: "left" | "right", userId: string) {
    const next = { ...active, key: rosterKey, [side]: userId };
    if (next.left === next.right) {
      const other = rows.find((row) => row.userId !== userId);
      if (side === "left") next.right = other?.userId ?? "";
      else next.left = other?.userId ?? "";
    }
    setChoice(next);
  }

  return (
    <section className="rounded-2xl border border-[var(--atria-primary)]/35 bg-white p-4 shadow-sm dark:bg-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--atria-primary)]">
          Disputa
        </h2>
        <p className="text-xs text-[var(--atria-primary)]/80">
          Escolha quem entra no ringue
        </p>
      </div>

      <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <FighterSide
          row={left}
          rows={rows}
          selectedId={active.left}
          otherId={active.right}
          score={leftScore}
          share={leftShare}
          mood={left && right ? mood.left : "neutral"}
          onChange={(userId) => pick("left", userId)}
        />
        <div className="flex flex-col items-center justify-center pb-8">
          <span className="fight-impact text-3xl" aria-hidden>
            💥
          </span>
          <span className="sr-only">Luta entre as duas pessoas escolhidas</span>
        </div>
        <FighterSide
          row={right}
          rows={rows}
          selectedId={active.right}
          otherId={active.left}
          score={rightScore}
          share={100 - leftShare}
          mood={left && right ? mood.right : "neutral"}
          onChange={(userId) => pick("right", userId)}
          align="right"
        />
      </div>

      <p className="mt-4 text-sm font-medium text-[var(--atria-primary)]">
        {verdict}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--atria-primary)]/80">
        Cada pessoa soma as ações do próprio cargo. SDR conta ligações,
        mensagens, leads e reuniões. Designer conta tarefas
        criadas, arquivos, tarefas concluídas, comentários e aprovações do
        cliente.
      </p>
    </section>
  );
}

function moodFor(leftScore: number, rightScore: number): {
  left: Mood;
  right: Mood;
} {
  if (leftScore === rightScore) return { left: "neutral", right: "neutral" };
  if (leftScore > rightScore) return { left: "happy", right: "sad" };
  return { left: "sad", right: "happy" };
}

function verdictFor(
  left: ProductivityRow | null,
  right: ProductivityRow | null,
  leftScore: number,
  rightScore: number,
): string {
  if (!left || !right) return "Escolha duas pessoas para a disputa.";
  if (leftScore === rightScore) {
    return `Empate entre ${left.name} e ${right.name}.`;
  }
  const winner = leftScore > rightScore ? left : right;
  const ahead = Math.max(leftScore, rightScore);
  const gap = Math.round((Math.abs(leftScore - rightScore) / ahead) * 100);
  return `${winner.name} está ${gap}% à frente.`;
}

function FighterSide({
  row,
  rows,
  selectedId,
  otherId,
  score,
  share,
  mood,
  onChange,
  align = "left",
}: {
  row: ProductivityRow | null;
  rows: ProductivityRow[];
  selectedId: string;
  otherId: string;
  score: number;
  share: number;
  mood: Mood;
  onChange: (userId: string) => void;
  align?: "left" | "right";
}) {
  const height = score <= 0 ? 0 : Math.max(share, 12);
  return (
    <div className={cn("flex flex-col gap-3", align === "right" && "sm:items-end")}>
      <label className="flex w-full flex-col gap-1 text-xs font-medium text-[var(--atria-primary)]">
        Lutador
        <select
          className={cn(inputClassName, "h-8")}
          value={selectedId}
          onChange={(event) => onChange(event.target.value)}
        >
          {rows.map((person) => (
            <option
              key={person.userId}
              value={person.userId}
              disabled={person.userId === otherId}
            >
              {person.name} · {roleLabel(person.role)}
            </option>
          ))}
        </select>
      </label>
      {row ? (
        <StickFighter
          name={row.name}
          avatarUrl={row.avatarUrl}
          mood={mood}
        />
      ) : null}
      <div className="flex w-16 flex-col items-center gap-1">
        <span className="text-sm font-semibold tabular-nums text-[var(--atria-primary)]">
          {numberFormat.format(score)}
        </span>
        <div className="flex h-16 w-full items-end rounded-md bg-[var(--atria-primary)]/15">
          <div
            className={cn(
              "w-full rounded-md transition-[height] duration-500",
              mood === "happy"
                ? "bg-[var(--atria-primary)]"
                : "bg-[var(--atria-primary)]/45",
            )}
            style={{ height: `${height}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function StickFighter({
  name,
  avatarUrl,
  mood,
}: {
  name: string;
  avatarUrl: string | null;
  mood: Mood;
}) {
  const photo = resolveMediaUrl(avatarUrl);
  const armsUp = mood === "happy";
  return (
    <div
      className={cn(
        "relative h-44 w-28",
        mood === "happy" && "fight-winner",
        mood === "sad" && "fight-loser",
      )}
    >
      <svg viewBox="0 0 112 176" className="h-full w-full" aria-hidden>
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          className="text-[var(--atria-primary)]"
        >
          <path d={armsUp ? "M56 78 L28 48 M56 78 L84 48" : "M56 78 L34 108 M56 78 L78 108"} />
          <path d="M56 70 V118" />
          <path d="M56 118 L36 158 M56 118 L76 158" />
        </g>
      </svg>
      <div className="absolute top-1 left-1/2 size-14 -translate-x-1/2 overflow-hidden rounded-full border-2 border-[var(--atria-primary)] bg-[var(--atria-primary)]">
        {photo ? (
          <img src={photo} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-sm font-semibold text-white">
            {initials(name)}
          </span>
        )}
        <Face mood={mood} />
      </div>
      <span className="sr-only">
        {name} está {mood === "happy" ? "feliz" : mood === "sad" ? "triste" : "neutro"}
      </span>
    </div>
  );
}

function Face({ mood }: { mood: Mood }) {
  const mouth =
    mood === "happy"
      ? "M18 30 Q28 40 38 30"
      : mood === "sad"
        ? "M18 38 Q28 28 38 38"
        : "M18 34 H38";
  return (
    <svg
      viewBox="0 0 56 56"
      className="absolute inset-0"
      aria-hidden
    >
      <ellipse cx="28" cy="34" rx="16" ry="12" fill="white" fillOpacity="0.82" />
      <circle cx="21" cy="30" r="2.2" fill="#0f172a" />
      <circle cx="35" cy="30" r="2.2" fill="#0f172a" />
      <path
        d={mouth}
        fill="none"
        stroke="#0f172a"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
