"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AssetPickerButton } from "@/components/assets/asset-picker-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ContentStatusBadge } from "@/components/content/content-status-badge";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ReferenceUrlField } from "@/components/ui/reference-url-field";
import { calendarService, contentService, ApiError } from "@/services";
import type {
  Client,
  ContentPost,
  ContentPostFormat,
  ContentPostStatus,
  ContentPlatform,
  CreateContentPostInput,
  TeamMember,
} from "@/services/types";

const FORMAT_LABELS: Record<ContentPostFormat, string> = {
  carousel: "Carrossel",
  reels: "Reels",
  static: "Estático",
  story: "Story",
};

interface PostFormDialogProps {
  clients: Client[];
  defaultClientId?: string;
  /** Status inicial ao criar (ex.: agendamento abre como "scheduled"). */
  defaultStatus?: ContentPostStatus;
  post?: ContentPost | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess: () => void;
  trigger?: boolean;
}

export function PostFormDialog({
  clients,
  defaultClientId,
  defaultStatus = "scheduled",
  post,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
  trigger = true,
}: PostFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);

  const [title, setTitle] = useState(post?.title ?? "");
  const [clientId, setClientId] = useState(
    post?.clientId ?? defaultClientId ?? clients[0]?.id ?? "",
  );
  const [platform, setPlatform] = useState<ContentPlatform>(
    post?.platform ?? "instagram",
  );
  const [format, setFormat] = useState<ContentPostFormat>(
    post?.format ?? "static",
  );
  const [status, setStatus] = useState<ContentPostStatus>(
    post?.status ?? defaultStatus,
  );
  const [assigneeId, setAssigneeId] = useState(post?.assignee?.id ?? "");
  const [scheduledDate, setScheduledDate] = useState(
    post?.scheduledDate
      ? new Date(post.scheduledDate).toISOString().slice(0, 16)
      : "",
  );
  const [copy, setCopy] = useState(post?.copy ?? "");
  const [referenceUrl, setReferenceUrl] = useState(post?.referenceUrl ?? "");
  const [attachments, setAttachments] = useState<
    { name: string; url: string }[]
  >(post?.attachments.map((a) => ({ name: a.name, url: a.url })) ?? []);
  const [publishToInstagram, setPublishToInstagram] = useState(
    post?.publishToInstagram ?? false,
  );

  const isEditing = Boolean(post);
  const showScheduleFields =
    status === "scheduled" || status === "approved";
  const workflowLocked =
    isEditing &&
    (status === "pending_approval" ||
      status === "approved" ||
      status === "rejected");

  useEffect(() => {
    if (open) {
      calendarService.getTeamMembers().then(setMembers).catch(() => setMembers([]));
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (post) {
      setTitle(post.title);
      setClientId(post.clientId);
      setPlatform(post.platform);
      setFormat(post.format);
      setStatus(post.status);
      setAssigneeId(post.assignee?.id ?? "");
      setScheduledDate(
        post.scheduledDate
          ? new Date(post.scheduledDate).toISOString().slice(0, 16)
          : "",
      );
      setCopy(post.copy);
      setReferenceUrl(post.referenceUrl ?? "");
      setAttachments(
        post.attachments.map((a) => ({ name: a.name, url: a.url })),
      );
      setPublishToInstagram(post.publishToInstagram ?? false);
    } else {
      setTitle("");
      setClientId(defaultClientId ?? clients[0]?.id ?? "");
      setPlatform("instagram");
      setFormat("static");
      setStatus(defaultStatus);
      setAssigneeId("");
      setScheduledDate("");
      setPublishToInstagram(defaultStatus === "scheduled");
      setCopy("");
      setReferenceUrl("");
      setAttachments([]);
      setPublishToInstagram(false);
    }
    setError(null);
  }, [post, open, defaultClientId, clients, defaultStatus]);

  function addAttachment() {
    setAttachments((prev) => [...prev, { name: "", url: "" }]);
  }

  function updateAttachment(
    index: number,
    field: "name" | "url",
    value: string,
  ) {
    setAttachments((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    );
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (showScheduleFields && !scheduledDate.trim()) {
      setError("Informe a data e hora da publicação.");
      return;
    }
    setLoading(true);
    setError(null);

    const payload: CreateContentPostInput = {
      title,
      clientId,
      platform,
      format,
      ...(workflowLocked ? {} : { status }),
      copy,
      referenceUrl: referenceUrl.trim() ? referenceUrl.trim() : null,
      assigneeId: assigneeId || undefined,
      scheduledDate:
        scheduledDate && showScheduleFields
          ? new Date(scheduledDate).toISOString()
          : undefined,
      attachments: attachments.filter((a) => a.name && a.url),
      publishToInstagram:
        platform === "instagram" && format === "static"
          ? publishToInstagram
          : false,
    };

    try {
      if (isEditing && post) {
        await contentService.updatePost(post.id, payload);
      } else {
        await contentService.createPost(payload);
      }

      setOpen(false);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o post.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!post) return;
    setLoading(true);
    try {
      await contentService.deletePost(post.id);
      setOpen(false);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedClient = clients.find((c) => c.id === clientId);

  const dialogContent = (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle className="text-[var(--atria-primary)]">
            {isEditing ? "Editar Post" : "Novo Post de Conteúdo"}
          </DialogTitle>
          {selectedClient && !isEditing && (
            <p className="text-sm text-[var(--atria-primary)]/50">
              Criar {FORMAT_LABELS[format].toLowerCase()} para{" "}
              {platform} da {selectedClient.companyName}
            </p>
          )}
        </DialogHeader>

        <FieldGroup className="py-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <Field>
            <FieldLabel htmlFor="post-title">Título *</FieldLabel>
            <Input
              id="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="post-client">Cliente *</FieldLabel>
            <select
              id="post-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              required
            >
              {clients.length === 0 ? (
                <option value="">Cadastre um cliente primeiro</option>
              ) : (
                clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName}
                  </option>
                ))
              )}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="post-platform">Plataforma *</FieldLabel>
              <select
                id="post-platform"
                value={platform}
                onChange={(e) =>
                  setPlatform(e.target.value as ContentPlatform)
                }
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="post-format">Formato *</FieldLabel>
              <select
                id="post-format"
                value={format}
                onChange={(e) =>
                  setFormat(e.target.value as ContentPostFormat)
                }
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="post-status">Status</FieldLabel>
              {workflowLocked ? (
                <div className="flex h-8 items-center">
                  <ContentStatusBadge status={status} />
                </div>
              ) : (
                <select
                  id="post-status"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as ContentPostStatus)
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="draft">Rascunho</option>
                  <option value="scheduled">Agendado</option>
                  <option value="approved">Aprovado</option>
                  {isEditing && (
                    <option value="published">Publicado</option>
                  )}
                </select>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="post-assignee">Responsável</FieldLabel>
              <select
                id="post-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">Nenhum</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {showScheduleFields && (
            <Field>
              <FieldLabel htmlFor="post-schedule">
                Data e hora da publicação *
              </FieldLabel>
              <Input
                id="post-schedule"
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Horário do seu navegador (ex.: domingo 18:30).
              </p>
            </Field>
          )}

          {platform === "instagram" && format === "static" && showScheduleFields && (
            <Field>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={publishToInstagram}
                  onChange={(e) => setPublishToInstagram(e.target.checked)}
                />
                <span>
                  Publicar automaticamente no Instagram neste horário
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Requer conta IG conectada, imagem anexada e status
                    aprovado ou agendado.
                  </span>
                </span>
              </label>
              {post?.publishStatus && post.publishStatus !== "none" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Status Instagram:{" "}
                  <span className="font-medium text-foreground">
                    {post.publishStatus}
                  </span>
                  {post.publishError ? ` — ${post.publishError}` : null}
                  {post.instagramPermalink ? (
                    <>
                      {" "}
                      <a
                        href={post.instagramPermalink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        Ver no Instagram
                      </a>
                    </>
                  ) : null}
                </p>
              )}
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="post-copy">Copy / Legenda *</FieldLabel>
            <textarea
              id="post-copy"
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              required
              rows={4}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
            />
          </Field>

          <ReferenceUrlField
            id="post-reference"
            label="Link de referência (Figma, Drive, etc.)"
            value={referenceUrl}
            onChange={setReferenceUrl}
          />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <FieldLabel>Anexos</FieldLabel>
              <div className="flex gap-2">
                <AssetPickerButton
                  clientId={clientId}
                  onSelect={(att) =>
                    setAttachments((prev) => [...prev, att])
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={addAttachment}
                >
                  <Plus className="size-3" />
                  URL
                </Button>
              </div>
            </div>
            {attachments.map((att, index) => (
              <div key={index} className="mb-2 flex gap-2">
                <Input
                  placeholder="Nome"
                  value={att.name}
                  onChange={(e) =>
                    updateAttachment(index, "name", e.target.value)
                  }
                  className="flex-1"
                />
                <Input
                  placeholder="URL"
                  value={att.url}
                  onChange={(e) =>
                    updateAttachment(index, "url", e.target.value)
                  }
                  className="flex-[2]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeAttachment(index)}
                >
                  <Trash2 className="size-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </FieldGroup>

        <DialogFooter className="gap-2">
          {isEditing && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={loading}
            >
              Excluir
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading || !clientId}
            className="bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]/90"
          >
            {loading ? "Salvando..." : isEditing ? "Atualizar" : "Criar Post"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );

  if (!trigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]/90" />
        }
      >
        <Plus className="size-4" />
        Novo Post
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
