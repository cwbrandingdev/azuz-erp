import type { KanbanColumn } from "@/services/types";

export function moveColumn(
  columns: KanbanColumn[],
  fromIndex: number,
  toIndex: number,
): KanbanColumn[] {
  const next = [...columns];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return columns;

  next.splice(toIndex, 0, moved);
  return next.map((column, index) => ({ ...column, order: index }));
}
