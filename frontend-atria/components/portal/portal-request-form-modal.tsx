"use client";

import { useRef, useState } from "react";
import { Info, Link2, Loader2, Paperclip, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PortalActionHandlers } from "@/components/portal/portal-actions";
import { Button } from "@/components/ui/button";
import { PORTAL_REQUEST_CONTENT_TYPES } from "@/lib/portal-request-content-types";
import { toast } from "@/lib/toast";
import type { PortalRequestContentType } from "@/services/types";

interface PortalRequestFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: Pick<PortalActionHandlers, "createRequest" | "uploadAsset">;
  onCreated?: () => void | Promise<void>;
}

export function PortalRequestFormModal({
  open,
  onOpenChange,
  actions,
  onCreated,
}: PortalRequestFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] =
    useState<PortalRequestContentType>("rede_social");
  const [referenceLinks, setReferenceLinks] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setTitle("");
    setDescription("");
    setContentType("rede_social");
    setReferenceLinks("");
    setFiles([]);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Informe um título para a solicitação.");
      return;
    }

    setSubmitting(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const asset = await actions.uploadAsset(file);
        uploaded.push({
          name: asset.fileName,
          url: asset.fileUrl,
          mimeType: file.type,
          fileSize: file.size,
        });
      }

      const links = referenceLinks
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);

      await actions.createRequest({
        title: title.trim(),
        description: description.trim() || undefined,
        contentType,
        referenceLinks: links,
        attachments: uploaded,
      });

      toast.success("Solicitação enviada com sucesso!");
      resetForm();
      onOpenChange(false);
      await onCreated?.();
    } catch {
      toast.error("Não foi possível enviar a solicitação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) resetForm();
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova solicitação</DialogTitle>
        </DialogHeader>

        <div className="flex gap-3 rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <Info className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-300" />
          <p>
            <span className="font-extrabold">Prazo de entrega:</span> As
            solicitações levam no mínimo 3 dias ÚTEIS para processamento.
          </p>
        </div>

        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="request-title">Título</FieldLabel>
            <Input
              id="request-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex: Campanha de lançamento do produto"
            />
          </Field>

          <Field>
            <FieldLabel>Tipo de mídia</FieldLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PORTAL_REQUEST_CONTENT_TYPES.map((type) => {
                const Icon = type.icon;
                const selected = contentType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setContentType(type.id)}
                    className={cn(
                      "rounded-2xl border px-3 py-3 text-left transition",
                      selected
                        ? "border-[var(--atria-primary)] bg-[var(--atria-primary)]/5 shadow-sm"
                        : "border-[var(--atria-primary)]/10 hover:border-[var(--atria-primary)]/25",
                    )}
                  >
                    <Icon className="mb-2 size-4 text-[var(--atria-primary)]" />
                    <p className="text-sm font-semibold text-[var(--atria-primary)]">
                      {type.label}
                    </p>
                    <p className="text-[11px] text-[var(--atria-primary)]/50">
                      {type.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="request-description">Descrição</FieldLabel>
            <textarea
              id="request-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              placeholder="Conte a ideia, tom de voz, CTA e qualquer detalhe importante..."
              className="w-full rounded-xl border border-[var(--atria-primary)]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--atria-primary)]/35"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="request-links">Links de referência</FieldLabel>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-3 size-4 text-[var(--atria-primary)]/35" />
              <textarea
                id="request-links"
                value={referenceLinks}
                onChange={(event) => setReferenceLinks(event.target.value)}
                rows={3}
                placeholder="Cole um link por linha"
                className="w-full rounded-xl border border-[var(--atria-primary)]/15 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--atria-primary)]/35"
              />
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="request-files">Anexos</FieldLabel>
            <input
              ref={fileInputRef}
              id="request-files"
              type="file"
              multiple
              accept="image/*,video/*,.pdf"
              className="sr-only"
              onChange={(event) => {
                const selected = Array.from(event.target.files ?? []);
                setFiles(selected);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full justify-start gap-2 rounded-xl border-[var(--atria-primary)]/15 text-[var(--atria-primary)]"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="size-4" />
              {files.length > 0 ? "Trocar arquivos" : "Escolher arquivos"}
            </Button>
            {files.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {files.map((file) => (
                  <li
                    key={`${file.name}-${file.size}`}
                    className="flex items-center gap-2 rounded-lg bg-[var(--atria-primary)]/[0.04] px-2 py-1.5 text-xs text-[var(--atria-primary)]"
                  >
                    <Paperclip className="size-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <button
                      type="button"
                      className="rounded p-0.5 text-[var(--atria-primary)]/50 hover:bg-white hover:text-[var(--atria-primary)]"
                      aria-label={`Remover ${file.name}`}
                      onClick={() => {
                        const next = files.filter((item) => item !== file);
                        setFiles(next);
                        if (fileInputRef.current && next.length === 0) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !title.trim()}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Enviar solicitação"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
