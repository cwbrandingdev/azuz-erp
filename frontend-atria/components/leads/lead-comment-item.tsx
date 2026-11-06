"use client";

import { useState } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/kanban-utils";
import { resolveMediaUrl } from "@/lib/media-url";
import type { LeadComment } from "@/services/types";

const COMMENT_MAX_LENGTH = 5000;

// O banco atualiza updatedAt alguns milissegundos depois do createdAt ao criar,
// então só consideramos editado quando a diferença passa de 1 segundo.
function wasEdited(comment: LeadComment) {
  const created = new Date(comment.createdAt).getTime();
  const updated = new Date(comment.updatedAt).getTime();
  return updated - created > 1000;
}

interface LeadCommentItemProps {
  comment: LeadComment;
  dateLabel: string;
  canEdit: boolean;
  canDelete: boolean;
  onUpdate: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

export function LeadCommentItem({
  comment,
  dateLabel,
  canEdit,
  canDelete,
  onUpdate,
  onDelete,
}: LeadCommentItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [busy, setBusy] = useState(false);
  const src = resolveMediaUrl(comment.user.avatarUrl);
  const trimmedDraft = draft.trim();

  function startEditing() {
    setDraft(comment.content);
    setEditing(true);
  }

  async function handleSave() {
    if (!trimmedDraft) return;
    if (trimmedDraft === comment.content) {
      setEditing(false);
      return;
    }

    setBusy(true);
    try {
      await onUpdate(comment.id, trimmedDraft);
      setEditing(false);
    } catch {
      // O erro já aparece em toast pela camada de API; o texto fica para tentar de novo.
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await onDelete(comment.id);
    } catch {
      // O erro já aparece em toast pela camada de API.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="group flex gap-2.5">
      <Avatar className="size-8 shrink-0">
        {src && <AvatarImage src={src} alt={comment.user.name} />}
        <AvatarFallback className="bg-[var(--atria-accent)] text-[10px] font-semibold text-[var(--atria-primary)]">
          {getInitials(comment.user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-[var(--atria-primary)]/8">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-semibold text-[var(--atria-primary)]">
            {comment.user.name}
          </p>
          <div className="flex items-center gap-1">
            <p className="text-[10px] text-[var(--atria-primary)]/45">
              {dateLabel}
              {wasEdited(comment) && " (editado)"}
            </p>
            {!editing && (canEdit || canDelete) && (
              <div className="flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                {canEdit && (
                  <button
                    type="button"
                    aria-label="Editar comentário"
                    disabled={busy}
                    onClick={startEditing}
                    className="rounded p-1 text-[var(--atria-primary)]/45 hover:bg-[var(--atria-primary)]/5 hover:text-[var(--atria-primary)]"
                  >
                    <Pencil className="size-3" />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    aria-label="Apagar comentário"
                    disabled={busy}
                    onClick={() => void handleDelete()}
                    className="rounded p-1 text-[var(--atria-primary)]/45 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={COMMENT_MAX_LENGTH}
              rows={3}
              autoFocus
              aria-label="Editar comentário"
              className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy || !trimmedDraft}
                onClick={() => void handleSave()}
                className="gap-2"
              >
                {busy && <Loader2 className="size-3.5 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-[var(--atria-primary)]/80">
            {comment.content}
          </p>
        )}
      </div>
    </div>
  );
}