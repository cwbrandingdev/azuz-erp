"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ApiError, clientGroupsService } from "@/services";
import type { ClientGroup } from "@/services/types";

interface ClientGroupsManagerProps {
  onChange?: () => void;
}

export function ClientGroupsManager({ onChange }: ClientGroupsManagerProps) {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clientGroupsService.getClientGroups();
      setGroups(data);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadGroups();
  }, [open, loadGroups]);

  async function handleDelete(id: string) {
    if (!confirm("Excluir este grupo de clientes?")) return;

    try {
      await clientGroupsService.deleteClientGroup(id);
      await loadGroups();
      onChange?.();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir o grupo.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="border-[var(--atria-primary)]/20 text-[var(--atria-primary)]" />
        }
      >
        Gerenciar Grupos
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[var(--atria-primary)]">
            Grupos de Clientes
          </DialogTitle>
        </DialogHeader>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-[var(--atria-primary)]/50">Carregando...</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-[var(--atria-primary)]/50">
            Nenhum grupo cadastrado.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--atria-primary)]/10 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <div>
                    <p className="font-medium text-[var(--atria-primary)]">
                      {group.name}
                    </p>
                    {group.description && (
                      <p className="text-xs text-[var(--atria-primary)]/50">
                        {group.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--atria-primary)]/50">
                    {group.clientCount} cliente
                    {group.clientCount === 1 ? "" : "s"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void handleDelete(group.id)}
                  >
                    <Trash2 className="size-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
