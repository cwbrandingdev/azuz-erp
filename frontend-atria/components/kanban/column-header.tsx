"use client";

import { useState } from "react";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getColumnTypeLabel } from "@/lib/kanban-utils";
import { toast } from "@/lib/toast";
import { kanbanService, ApiError } from "@/services";
import type { KanbanColumn } from "@/services/types";

interface ColumnHeaderProps {
  column: KanbanColumn;
  taskCount: number;
  onUpdate: () => void;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

export function ColumnHeader({
  column,
  taskCount,
  onUpdate,
  dragHandleProps,
}: ColumnHeaderProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await kanbanService.updateColumn(column.id, { title });
      setRenameOpen(false);
      onUpdate();
      toast.success("Coluna atualizada");
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setError("Não foi possível renomear a coluna.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Excluir a coluna "${column.title}"?`)) return;

    try {
      await kanbanService.deleteColumn(column.id);
      onUpdate();
      toast.info("Coluna removida");
    } catch (err) {
      if (!(err instanceof ApiError)) {
        toast.error("Não foi possível excluir a coluna.");
      }
    }
  }

  return (
    <>
      <div
        className="rounded-t-2xl border border-b-0 border-[var(--atria-primary)]/10 bg-white px-3 py-2.5"
        style={{ borderTopColor: column.color, borderTopWidth: 3 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {dragHandleProps && (
              <button
                type="button"
                aria-label="Arrastar coluna"
                className="-ml-1 shrink-0 cursor-grab rounded p-1 text-[var(--atria-primary)]/40 hover:bg-[var(--atria-primary)]/5 hover:text-[var(--atria-primary)] active:cursor-grabbing"
                {...dragHandleProps}
              >
                <GripVertical className="size-4" />
              </button>
            )}
            <span
              className="size-2.5 shrink-0 rounded-full ring-2 ring-[var(--atria-accent)]/40"
              style={{ backgroundColor: column.color }}
            />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-[var(--atria-primary)]">
                {column.title}
              </h2>
              {getColumnTypeLabel(column.type) && (
                <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--atria-primary)]/40">
                  {getColumnTypeLabel(column.type)}
                </span>
              )}
            </div>
            <span className="shrink-0 rounded-full bg-[var(--atria-accent)]/40 px-2 py-0.5 text-xs font-semibold text-[var(--atria-primary)]">
              {taskCount}
            </span>
          </div>

          <DropdownMenu>
            {!column.statusKey && (
              <>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon-sm" />}
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setTitle(column.title);
                      setRenameOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                    Renomear
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                    <Trash2 className="size-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </>
            )}
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleRename}>
            <DialogHeader>
              <DialogTitle className="text-[var(--atria-primary)]">
                Renomear coluna
              </DialogTitle>
            </DialogHeader>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="my-4"
              required
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[var(--atria-primary)] text-white"
              >
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
