"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ExternalLink,
  Loader2,
  MessageSquare,
  Paperclip,
  SendHorizontal,
  Sparkles,
  XCircle,
} from "lucide-react";
import { RejectClientRequestDialog } from "@/components/clients/reject-client-request-dialog";
import { ConvertRequestToTaskDialog } from "@/components/clients/convert-request-to-task-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PORTAL_REQUEST_CONTENT_TYPE_LABELS } from "@/lib/portal-request-content-types";
import { resolveMediaUrl } from "@/lib/media-url";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { clientRequestsService } from "@/services";
import type {
  ClientRequest,
  ConvertClientRequestToTaskInput,
  PortalRequestStatus,
} from "@/services/types";

const STATUS_TABS: Array<{ id: PortalRequestStatus | "all"; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "pending", label: "Pendentes" },
  { id: "converted_to_task", label: "Em produção" },
  { id: "rejected", label: "Recusadas" },
];

const STATUS_LABELS: Record<PortalRequestStatus, string> = {
  pending: "Pendente",
  converted_to_task: "Convertida em tarefa",
  rejected: "Recusada",
};

interface ClientRequestsWorkspaceProps {
  clientId: string;
  clientName?: string;
  onUpdated?: () => void;
  layout?: "drawer" | "page";
}

function normalizeAttachments(
  attachments: ClientRequest["attachments"],
): Array<{ name?: string; url: string; mimeType?: string }> {
  if (!Array.isArray(attachments)) return [];
  const normalized: Array<{ name?: string; url: string; mimeType?: string }> =
    [];

  for (const item of attachments) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const url = typeof record.url === "string" ? record.url : "";
    if (!url) continue;
    normalized.push({
      url,
      name: typeof record.name === "string" ? record.name : undefined,
      mimeType:
        typeof record.mimeType === "string" ? record.mimeType : undefined,
    });
  }

  return normalized;
}

export function ClientRequestsWorkspace({
  clientId,
  clientName,
  onUpdated,
  layout = "page",
}: ClientRequestsWorkspaceProps) {
  const { canManageClientDirectory } = usePermissions();
  const canManageClients = canManageClientDirectory();
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PortalRequestStatus | "all">(
    "all",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertTarget, setConvertTarget] = useState<ClientRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ClientRequest | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clientRequestsService.getClientRequestsForClient(
        clientId,
      );
      setRequests(data);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
    } catch {
      setRequests([]);
      toast.error("Não foi possível carregar as solicitações do cliente.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter((item) => item.status === statusFilter);
  }, [requests, statusFilter]);

  const selected =
    filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  async function handleSendComment() {
    if (!selected || !comment.trim()) return;
    setSendingComment(true);
    try {
      const created = await clientRequestsService.addClientRequestComment(
        selected.id,
        comment.trim(),
      );
      setRequests((prev) =>
        prev.map((item) =>
          item.id === selected.id
            ? { ...item, comments: [...(item.comments ?? []), created] }
            : item,
        ),
      );
      setComment("");
      toast.success("Comentário enviado.");
    } catch {
      toast.error("Não foi possível enviar o comentário.");
    } finally {
      setSendingComment(false);
    }
  }

  async function handleConvertToTask(data: ConvertClientRequestToTaskInput) {
    if (!convertTarget) return;
    setConvertingId(convertTarget.id);
    try {
      const result = await clientRequestsService.convertClientRequestToTask(
        convertTarget.id,
        data,
      );
      setRequests((prev) =>
        prev.map((item) =>
          item.id === convertTarget.id ? result.request : item,
        ),
      );
      setConvertTarget(null);
      toast.success(
        result.alreadyConverted
          ? "Esta solicitação já estava vinculada a uma tarefa."
          : "Solicitação convertida em tarefa no kanban.",
      );
      onUpdated?.();
    } catch {
      toast.error("Não foi possível converter a solicitação em tarefa.");
    } finally {
      setConvertingId(null);
    }
  }

  async function handleReject(reason: string) {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      const updated = await clientRequestsService.rejectClientRequest(
        rejectTarget.id,
        reason,
      );
      setRequests((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setRejectTarget(null);
      toast.success("Solicitação recusada.");
      onUpdated?.();
    } catch {
      toast.error("Não foi possível recusar a solicitação.");
    } finally {
      setRejecting(false);
    }
  }

  const gridClassName =
    layout === "drawer"
      ? "grid min-h-[min(70vh,720px)] min-w-[880px] grid-cols-[300px_minmax(0,1fr)] gap-4"
      : "grid min-h-[520px] grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]";

  return (
    <>
      <div className="flex flex-col gap-4">
        {clientName && layout === "page" && (
          <div>
            <h2 className="text-lg font-semibold text-[var(--atria-primary)]">
              Solicitações / Ideias
            </h2>
            <p className="text-sm text-[var(--atria-primary)]/55">
              {clientName} · pedidos enviados pelo portal do cliente
            </p>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition",
                statusFilter === tab.id
                  ? "bg-[var(--atria-primary)] text-white"
                  : "bg-white text-[var(--atria-primary)]/70 ring-1 ring-[var(--atria-primary)]/10 hover:bg-[var(--atria-primary)]/5",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="size-7 animate-spin text-[var(--atria-primary)]" />
          </div>
        ) : (
          <div
            className={cn(
              layout === "drawer" && "min-h-0 flex-1 overflow-x-auto overflow-y-auto",
            )}
          >
            <div className={gridClassName}>
              <div className="flex flex-col gap-3 overflow-y-auto pr-1">
                {filtered.length === 0 ? (
                  <Card className="rounded-2xl border-dashed p-8 text-center text-sm text-[var(--atria-primary)]/50">
                    Nenhuma solicitação neste filtro.
                  </Card>
                ) : (
                  filtered.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        "rounded-2xl border bg-white p-4 text-left transition",
                        selected?.id === item.id
                          ? "border-[var(--atria-primary)] shadow-sm"
                          : "border-[var(--atria-primary)]/10 hover:border-[var(--atria-primary)]/25",
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="rounded-full bg-[var(--atria-primary)]/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--atria-primary)]">
                          {PORTAL_REQUEST_CONTENT_TYPE_LABELS[
                            item.contentType as keyof typeof PORTAL_REQUEST_CONTENT_TYPE_LABELS
                          ] ?? item.contentType}
                        </span>
                        <span className="text-[10px] text-[var(--atria-primary)]/45">
                          {STATUS_LABELS[item.status as PortalRequestStatus] ??
                            item.status}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm font-semibold text-[var(--atria-primary)]">
                        {item.title}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--atria-primary)]/45">
                        {new Date(item.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </button>
                  ))
                )}
              </div>

              {selected ? (
                <Card className="min-w-0 rounded-2xl border-[var(--atria-primary)]/10 bg-white p-5">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--atria-primary)]">
                        {selected.title}
                      </h3>
                      <p className="mt-1 text-xs text-[var(--atria-primary)]/50">
                        {PORTAL_REQUEST_CONTENT_TYPE_LABELS[
                          selected.contentType as keyof typeof PORTAL_REQUEST_CONTENT_TYPE_LABELS
                        ] ?? selected.contentType}{" "}
                        ·{" "}
                        {STATUS_LABELS[
                          selected.status as PortalRequestStatus
                        ] ?? selected.status}{" "}
                        · {new Date(selected.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selected.relatedTaskId ? (
                        <Link
                          href={`/kanban?taskId=${selected.relatedTaskId}`}
                          className="inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
                        >
                          <ArrowUpRight className="size-4" />
                          Ver tarefa
                        </Link>
                      ) : (
                        canManageClients && (
                          <>
                            <Button
                              type="button"
                              className="gap-2 bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]/90"
                              disabled={
                                convertingId === selected.id ||
                                selected.status === "rejected"
                              }
                              onClick={() => setConvertTarget(selected)}
                            >
                              {convertingId === selected.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Sparkles className="size-4" />
                              )}
                              Converter em Tarefa
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="gap-2 border-red-200 text-red-700 hover:bg-red-50"
                              disabled={selected.status === "rejected"}
                              onClick={() => setRejectTarget(selected)}
                            >
                              <XCircle className="size-4" />
                              Recusar Solicitação
                            </Button>
                          </>
                        )
                      )}
                    </div>
                  </div>

                  {selected.rejectionReason && (
                    <div className="mb-4 rounded-xl border border-red-200/80 bg-red-50/80 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-800">
                        Motivo da recusa
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-red-900/90">
                        {selected.rejectionReason}
                      </p>
                    </div>
                  )}

                  {selected.description && (
                    <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--atria-primary)]/80">
                      {selected.description}
                    </p>
                  )}

                  {selected.referenceLinks &&
                    selected.referenceLinks.length > 0 && (
                      <div className="mb-4 rounded-xl bg-[var(--atria-primary)]/[0.03] p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--atria-primary)]/45">
                          Referências
                        </p>
                        <ul className="space-y-1">
                          {selected.referenceLinks.map((link) => (
                            <li key={link}>
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 break-all text-sm text-[var(--atria-primary)] underline-offset-2 hover:underline"
                              >
                                {link}
                                <ExternalLink className="size-3.5 shrink-0" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {normalizeAttachments(selected.attachments).length > 0 && (
                    <div className="mb-4 rounded-xl bg-[var(--atria-primary)]/[0.03] p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Paperclip className="size-4 text-[var(--atria-primary)]/50" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--atria-primary)]/45">
                          Anexos
                        </p>
                      </div>
                      <ul className="space-y-2">
                        {normalizeAttachments(selected.attachments).map(
                          (attachment) => {
                            const url =
                              resolveMediaUrl(attachment.url) ?? attachment.url;
                            return (
                              <li key={attachment.url}>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-sm text-[var(--atria-primary)] underline-offset-2 hover:underline"
                                >
                                  <Paperclip className="size-3.5" />
                                  {attachment.name ?? "Arquivo anexado"}
                                </a>
                              </li>
                            );
                          },
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="mb-3 flex items-center gap-2">
                    <MessageSquare className="size-4 text-[var(--atria-primary)]" />
                    <h4 className="text-sm font-semibold text-[var(--atria-primary)]">
                      Discussão
                    </h4>
                  </div>

                  <div className="mb-4 flex max-h-72 flex-col gap-3 overflow-y-auto rounded-xl border border-[var(--atria-primary)]/8 p-3">
                    {(selected.comments ?? []).length === 0 ? (
                      <p className="text-sm text-[var(--atria-primary)]/45">
                        Nenhum comentário ainda.
                      </p>
                    ) : (
                      selected.comments?.map((entry) => (
                        <div
                          key={entry.id}
                          className={cn(
                            "rounded-xl px-3 py-2",
                            entry.parentId
                              ? "ml-4 border border-[var(--atria-primary)]/8 bg-[var(--atria-primary)]/[0.02]"
                              : "bg-[var(--atria-primary)]/[0.04]",
                          )}
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[var(--atria-primary)]">
                              {entry.author?.name ?? "Equipe"}
                            </span>
                            <span className="text-[10px] text-[var(--atria-primary)]/40">
                              {new Date(entry.createdAt).toLocaleString(
                                "pt-BR",
                              )}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-[var(--atria-primary)]/80">
                            {entry.body}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {canManageClients && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <textarea
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        rows={2}
                        placeholder="Responder ao cliente..."
                        className="min-h-[44px] flex-1 rounded-xl border border-[var(--atria-primary)]/15 px-3 py-2 text-sm outline-none focus:border-[var(--atria-primary)]/35"
                      />
                      <Button
                        type="button"
                        className="gap-2 sm:self-end"
                        disabled={sendingComment || !comment.trim()}
                        onClick={() => void handleSendComment()}
                      >
                        {sendingComment ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <SendHorizontal className="size-4" />
                        )}
                        Enviar
                      </Button>
                    </div>
                  )}
                </Card>
              ) : (
                <Card className="min-w-0 rounded-2xl border-dashed p-12 text-center text-sm text-[var(--atria-primary)]/50">
                  Selecione uma solicitação para ver os detalhes.
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      <ConvertRequestToTaskDialog
        open={!!convertTarget}
        onOpenChange={(open) => !open && setConvertTarget(null)}
        requestTitle={convertTarget?.title}
        submitting={convertingId === convertTarget?.id}
        onSubmit={handleConvertToTask}
      />
      <RejectClientRequestDialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        requestTitle={rejectTarget?.title}
        submitting={rejecting}
        onSubmit={handleReject}
      />
    </>
  );
}
