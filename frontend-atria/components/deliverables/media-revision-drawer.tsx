"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { MediaPreview } from "@/components/ui/media-preview";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { itemDisplayUrl } from "@/lib/media-url";
import { isPdfSource } from "@/lib/pdf-utils";
import type { DeliverableItem } from "@/services/types";

interface MediaRevisionDrawerProps {
  item: DeliverableItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (itemId: string, feedbackNotes: string) => Promise<void>;
  loading?: boolean;
}

export function MediaRevisionDrawer({
  item,
  open,
  onOpenChange,
  onSubmit,
  loading,
}: MediaRevisionDrawerProps) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && item) {
      setNotes(item.adjustmentNotes ?? item.feedbackNotes ?? "");
    }
    if (!open) {
      setNotes("");
    }
  }, [open, item]);

  async function handleSubmit() {
    if (!item) return;
    const trimmed = notes.trim();
    if (!trimmed) return;
    await onSubmit(item.id, trimmed);
  }

  const previewUrl = item ? itemDisplayUrl(item) : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-l border-white/20 bg-white/90 backdrop-blur-xl sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="text-[var(--atria-primary)]">
            Solicitar ajuste
          </SheetTitle>
        </SheetHeader>

        {item && (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
            <div className="overflow-hidden rounded-xl border border-[var(--atria-primary)]/10 bg-black/5">
              <MediaPreview
                url={previewUrl}
                mimeType={
                  item.mediaType === "video"
                    ? "video/mp4"
                    : item.mediaType === "image"
                      ? "image/jpeg"
                      : isPdfSource(item.mediaUrl, null, item.fileName)
                        ? "application/pdf"
                        : undefined
                }
                name={item.fileName ?? undefined}
                className="aspect-video w-full object-cover"
              />
            </div>

            <p className="truncate text-sm font-medium text-[var(--atria-primary)]">
              {item.fileName ?? "Mídia selecionada"}
            </p>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="media-revision-notes">
                  Observações do ajuste
                </FieldLabel>
                <textarea
                  id="media-revision-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={6}
                  placeholder="Descreva o que precisa ser alterado nesta imagem ou vídeo..."
                  className="w-full rounded-xl border border-[var(--atria-primary)]/20 bg-white px-3 py-2 text-sm text-[var(--atria-primary)] outline-none focus:border-[var(--atria-primary)]/40"
                />
              </Field>
            </FieldGroup>
          </div>
        )}

        <SheetFooter className="flex-row justify-end gap-2 border-t border-[var(--atria-primary)]/10 px-4 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleSubmit()}
            disabled={loading || !notes.trim()}
          >
            {loading ? "Enviando..." : "Enviar ajuste"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
