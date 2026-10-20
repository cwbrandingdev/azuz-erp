"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type {
  WhatsAppBotDefinition,
  WhatsAppBotNode,
  WhatsAppBotNodeType,
} from "@/services/whatsapp.service";

const NODE_W = 168;
const NODE_H = 76;
const GAP_X = 40;
const GAP_Y = 88;

const TYPE_STYLE: Record<
  WhatsAppBotNodeType,
  { label: string; className: string }
> = {
  message: { label: "Mensagem", className: "border-slate-300 bg-white" },
  menu: { label: "Menu", className: "border-violet-300 bg-violet-50" },
  question: { label: "Pergunta", className: "border-sky-300 bg-sky-50" },
  ai: { label: "IA", className: "border-fuchsia-300 bg-fuchsia-50" },
  handoff: { label: "Transferir", className: "border-amber-300 bg-amber-50" },
};

type Edge = { from: string; to: string; label?: string };

function collectEdges(definition: WhatsAppBotDefinition): Edge[] {
  const edges: Edge[] = [];
  for (const node of definition.nodes) {
    if (node.nextId) {
      edges.push({ from: node.id, to: node.nextId });
    }
    for (const option of node.options ?? []) {
      if (option.nextId) {
        edges.push({
          from: node.id,
          to: option.nextId,
          label: option.label,
        });
      }
    }
  }
  return edges;
}

function layoutNodes(definition: WhatsAppBotDefinition) {
  const level = new Map<string, number>();
  const queue: Array<{ id: string; depth: number }> = [
    { id: definition.startId, depth: 0 },
  ];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current.id)) continue;
    seen.add(current.id);
    level.set(
      current.id,
      Math.max(level.get(current.id) ?? 0, current.depth),
    );
    const node = definition.nodes.find((item) => item.id === current.id);
    if (!node) continue;
    const targets = [
      node.nextId,
      ...(node.options?.map((option) => option.nextId) ?? []),
    ].filter(Boolean) as string[];
    for (const target of targets) {
      queue.push({ id: target, depth: current.depth + 1 });
    }
  }

  let maxLevel = 0;
  for (const value of level.values()) {
    maxLevel = Math.max(maxLevel, value);
  }

  for (const node of definition.nodes) {
    if (!level.has(node.id)) {
      level.set(node.id, maxLevel + 1);
      maxLevel += 1;
    }
  }

  const byLevel = new Map<number, string[]>();
  for (const node of definition.nodes) {
    const row = level.get(node.id) ?? 0;
    const list = byLevel.get(row) ?? [];
    list.push(node.id);
    byLevel.set(row, list);
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const [row, ids] of byLevel.entries()) {
    const rowWidth = ids.length * NODE_W + (ids.length - 1) * GAP_X;
    let x = -rowWidth / 2 + NODE_W / 2;
    const y = row * (NODE_H + GAP_Y) + 24;
    for (const id of ids) {
      positions.set(id, { x, y });
      x += NODE_W + GAP_X;
    }
  }

  let minX = 0;
  let maxX = NODE_W;
  let maxY = NODE_H + 48;
  for (const pos of positions.values()) {
    minX = Math.min(minX, pos.x - NODE_W / 2);
    maxX = Math.max(maxX, pos.x + NODE_W / 2);
    maxY = Math.max(maxY, pos.y + NODE_H);
  }

  const offsetX = -minX + 24;
  for (const [id, pos] of positions.entries()) {
    positions.set(id, { x: pos.x + offsetX, y: pos.y });
  }

  return {
    positions,
    width: maxX - minX + 48,
    height: maxY + 48,
  };
}

function previewText(node: WhatsAppBotNode) {
  const text = (node.text ?? "").trim();
  if (text) return text.length > 48 ? `${text.slice(0, 48)}…` : text;
  if (node.type === "menu") {
    const count = node.options?.length ?? 0;
    return count > 0 ? `${count} opção(ões) clicáveis` : "Sem opções";
  }
  return TYPE_STYLE[node.type].label;
}

export function WhatsappBotFlowDiagram({
  definition,
  selectedNodeId,
  onSelectNode,
}: {
  definition: WhatsAppBotDefinition;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
}) {
  const edges = useMemo(() => collectEdges(definition), [definition]);
  const layout = useMemo(() => layoutNodes(definition), [definition]);

  if (definition.nodes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
        Adicione passos ao fluxo para ver o diagrama.
      </p>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-slate-200 bg-slate-50/80">
      <div
        className="relative"
        style={{
          width: Math.max(layout.width, 320),
          height: Math.max(layout.height, 200),
          minHeight: 220,
        }}
      >
        <svg
          className="pointer-events-none absolute inset-0"
          width={layout.width}
          height={layout.height}
        >
          {edges.map((edge, index) => {
            const from = layout.positions.get(edge.from);
            const to = layout.positions.get(edge.to);
            if (!from || !to) return null;
            const x1 = from.x;
            const y1 = from.y + NODE_H / 2;
            const x2 = to.x;
            const y2 = to.y - NODE_H / 2;
            const midY = (y1 + y2) / 2;
            return (
              <g key={`${edge.from}-${edge.to}-${index}`}>
                <path
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  markerEnd="url(#arrow)"
                />
              </g>
            );
          })}
          <defs>
            <marker
              id="arrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" />
            </marker>
          </defs>
        </svg>

        {definition.nodes.map((node) => {
          const pos = layout.positions.get(node.id);
          if (!pos) return null;
          const style = TYPE_STYLE[node.type];
          const isStart = node.id === definition.startId;
          const isSelected = node.id === selectedNodeId;
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelectNode(node.id)}
              className={cn(
                "absolute flex flex-col rounded-lg border-2 px-2 py-1.5 text-left shadow-sm transition-shadow hover:shadow-md",
                style.className,
                isSelected && "ring-2 ring-[var(--atria-primary)] ring-offset-1",
              )}
              style={{
                width: NODE_W,
                height: NODE_H,
                left: pos.x - NODE_W / 2,
                top: pos.y,
              }}
            >
              <span className="flex items-center justify-between gap-1">
                <span className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {style.label}
                </span>
                {isStart ? (
                  <span className="shrink-0 rounded bg-[var(--atria-primary)] px-1 text-[9px] font-semibold text-white">
                    início
                  </span>
                ) : null}
              </span>
              <span className="truncate text-xs font-semibold text-slate-800">
                {node.id}
              </span>
              <span className="line-clamp-2 text-[10px] leading-tight text-slate-600">
                {previewText(node)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
