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

function cargoOf(row: ProductivityRow): string {
  return row.role.toLowerCase();
}

function peersOf(rows: ProductivityRow[], person: ProductivityRow | null) {
  if (!person) return [];
  return rows.filter(
    (row) => row.userId !== person.userId && cargoOf(row) === cargoOf(person),
  );
}

function defaultIds(rows: ProductivityRow[]): { left: string; right: string } {
  const groups = new Map<string, ProductivityRow[]>();
  for (const row of rows) {
    const cargo = cargoOf(row);
    const group = groups.get(cargo) ?? [];
    group.push(row);
    groups.set(cargo, group);
  }
  const pair = [...groups.values()].find((group) => group.length >= 2);
  return {
    left: pair?.[0].userId ?? rows[0]?.userId ?? "",
    right: pair?.[1].userId ?? "",
  };
}

export function ProductivityFight({
  rows,
  className,
}: {
  rows: ProductivityRow[];
  className?: string;
}) {
  const rosterKey = rows.map((row) => row.userId).join("|");
  const [choice, setChoice] = useState<{
    key: string;
    left: string;
    right: string;
  } | null>(null);
  const stored =
    choice && choice.key === rosterKey
      ? choice
      : { key: rosterKey, ...defaultIds(rows) };
  const storedLeft = rows.find((row) => row.userId === stored.left) ?? null;
  const storedRight = rows.find((row) => row.userId === stored.right) ?? null;
  const active =
    storedLeft &&
    storedRight &&
    cargoOf(storedLeft) !== cargoOf(storedRight)
      ? { key: rosterKey, ...defaultIds(rows) }
      : stored;

  const left = rows.find((row) => row.userId === active.left) ?? null;
  const right =
    rows.find(
      (row) =>
        row.userId === active.right &&
        left != null &&
        cargoOf(row) === cargoOf(left),
    ) ?? null;
  const opponents = peersOf(rows, left);
  const leftScore = left ? personScore(left) : 0;
  const rightScore = right ? personScore(right) : 0;
  const combined = leftScore + rightScore;
  const leftShare = combined === 0 ? 50 : (leftScore / combined) * 100;
  const mood = moodFor(leftScore, rightScore);
  const verdict = verdictFor(left, right, leftScore, rightScore);

  function pick(side: "left" | "right", userId: string) {
    if (side === "right") {
      setChoice({ key: rosterKey, left: active.left, right: userId });
      return;
    }
    const chosen = rows.find((row) => row.userId === userId) ?? null;
    const stillValid =
      right != null && chosen != null && cargoOf(right) === cargoOf(chosen);
    const nextRight = stillValid
      ? right.userId
      : peersOf(rows, chosen)[0]?.userId ?? "";
    setChoice({ key: rosterKey, left: userId, right: nextRight });
  }

  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 max-w-full flex-col overflow-hidden rounded-2xl border border-[var(--atria-primary)]/35 bg-white p-3 shadow-sm dark:bg-card",
        className,
      )}
    >
      <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--atria-primary)]">
          Disputa
        </h2>
        <p className="text-xs text-[var(--atria-primary)]/80">
          Só entre o mesmo cargo
        </p>
      </div>

      <div className="grid min-h-0 min-w-0 flex-1 items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <FighterSide
          row={left}
          rows={rows}
          selectedId={active.left}
          otherId=""
          score={leftScore}
          share={leftShare}
          mood={left && right ? mood.left : "neutral"}
          onChange={(userId) => pick("left", userId)}
        />
        <div className="flex flex-col items-center justify-end pb-6">
          <span className="fight-impact text-3xl" aria-hidden>
            💥
          </span>
          <span className="sr-only">Luta entre as duas pessoas escolhidas</span>
        </div>
        <FighterSide
          row={right}
          rows={opponents}
          selectedId={right?.userId ?? ""}
          otherId=""
          score={rightScore}
          share={100 - leftShare}
          mood={left && right ? mood.right : "neutral"}
          onChange={(userId) => pick("right", userId)}
          align="right"
        />
      </div>

      <p className="mt-2 shrink-0 truncate text-sm font-medium text-[var(--atria-primary)]">
        {verdict}
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
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col gap-1.5",
        align === "right" && "sm:items-end",
      )}
    >
      <label className="flex w-full flex-col gap-1 text-xs font-medium text-[var(--atria-primary)]">
        Lutador
        <select
          className={cn(inputClassName, "h-8 w-full min-w-0 max-w-full")}
          value={selectedId}
          onChange={(event) => onChange(event.target.value)}
        >
          {rows.length === 0 ? (
            <option value="">Ninguém nesse cargo</option>
          ) : null}
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
        <div className="flex h-24 w-full items-end justify-center lg:h-auto lg:min-h-0 lg:flex-1">
          <StickFighter
            name={row.name}
            avatarUrl={row.avatarUrl}
            mood={mood}
          />
        </div>
      ) : (
        <div className="h-24 lg:h-auto lg:min-h-0 lg:flex-1" />
      )}
      <div className="flex w-14 shrink-0 flex-col items-center gap-1">
        <span className="text-xs font-semibold tabular-nums text-[var(--atria-primary)]">
          {numberFormat.format(score)}
        </span>
        <div className="flex h-8 w-full items-end rounded-md bg-[var(--atria-primary)]/15">
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
        "relative h-full max-h-28 w-16",
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
      <div className="absolute top-[2%] left-1/2 aspect-square w-[48%] -translate-x-1/2 overflow-hidden rounded-full border-2 border-[var(--atria-primary)] bg-[var(--atria-primary)]">
        {photo ? (
          <img src={photo} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-[10px] font-semibold text-white">
            {initials(name)}
          </span>
        )}
      </div>
      <span className="sr-only">{name}</span>
    </div>
  );
}
