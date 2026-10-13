"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useWhatsappCannedResponses,
  useWhatsappMutations,
} from "@/hooks/use-whatsapp";
import { toast } from "@/lib/toast";

export function WhatsappCannedManager({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: canned = [] } = useWhatsappCannedResponses();
  const { createCanned, deleteCanned } = useWhatsappMutations();
  const [shortCode, setShortCode] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await createCanned.mutateAsync({
        shortCode,
        title,
        content,
        file,
      });
      setShortCode("");
      setTitle("");
      setContent("");
      setFile(null);
      toast.success("Resposta pronta salva.");
    } catch {
      toast.error("Não foi possível salvar a resposta pronta.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Respostas prontas</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-2" onSubmit={(event) => void handleCreate(event)}>
          <Input
            value={shortCode}
            onChange={(event) => setShortCode(event.target.value)}
            placeholder="atalho (ex: preco)"
            required
          />
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Título"
            required
          />
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Texto ou legenda da mídia"
            rows={3}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="file"
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="text-xs"
          />
          <Button
            type="submit"
            disabled={createCanned.isPending || !shortCode.trim() || !title.trim()}
          >
            Adicionar
          </Button>
        </form>
        <div className="mt-4 flex flex-col gap-2">
          {canned.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhuma resposta pronta.</p>
          ) : (
            canned.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-2 rounded-md border border-slate-100 px-2 py-1.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700">
                    /{item.shortCode} · {item.title}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {item.mediaFilename
                      ? `${item.kind} · ${item.mediaFilename}`
                      : item.content}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void deleteCanned.mutateAsync(item.id)}
                >
                  Excluir
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
