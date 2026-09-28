"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare, SendHorizontal, Sparkles } from "lucide-react";
import type { PortalActionHandlers } from "@/components/portal/portal-actions";
import { PortalRequestFormModal } from "@/components/portal/portal-request-form-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type {
  PortalClientRequest,
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

import { PORTAL_REQUEST_CONTENT_TYPE_LABELS } from "@/lib/portal-request-content-types";

interface PortalRequestsPanelProps {
  actions: Pick<
    PortalActionHandlers,
    | "listRequests"
    | "createRequest"
    | "addRequestComment"
    | "uploadAsset"
    | "resolveAssetUrl"
  >;
}

export function PortalRequestsPanel({ actions }: PortalRequestsPanelProps) {
  const [requests, setRequests] = useState<PortalClientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PortalRequestStatus | "all">(
    "all",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await actions.listRequests();
      setRequests(data);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
    } catch {
      setRequests([]);
      toast.error("Não foi possível carregar as solicitações.");
    } finally {
      setLoading(false);
    }
  }, [actions]);

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
      const created = await actions.addRequestComment(
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

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-7 animate-spin text-[var(--atria-primary)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div data-tour="portal-requests-header" className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--atria-primary)]">
            Solicitações
          </h2>
          <p className="text-sm text-[var(--atria-primary)]/55">
            Envie pedidos de conteúdo e acompanhe a conversa com a equipe.
          </p>
        </div>
        <Button
          type="button"
          data-tour="portal-requests-new"
          className="h-11 gap-2 bg-[var(--atria-primary)] px-5 text-sm font-semibold text-white shadow-lg shadow-[var(--atria-primary)]/25 hover:bg-[var(--atria-primary)]/90"
          onClick={() => setFormOpen(true)}
        >
          <Sparkles className="size-4" />
          Nova solicitação
        </Button>
      </div>

      <div data-tour="portal-requests-filters" className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition",
              statusFilter === tab.id
                ? "bg-[var(--atria-primary)] text-white"
                : "bg-white text-[var(--atria-primary)]/70 ring-1 ring-[var(--atria-primary)]/10 hover:bg-[var(--atria-primary)]/5",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div data-tour="portal-requests-workspace" className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
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
                    {PORTAL_REQUEST_CONTENT_TYPE_LABELS[item.contentType] ??
                      item.contentType}
                  </span>
                  <span className="text-[10px] text-[var(--atria-primary)]/45">
                    {STATUS_LABELS[item.status]}
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
          <Card className="rounded-2xl border-[var(--atria-primary)]/10 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--atria-primary)]">
                  {selected.title}
                </h3>
                <p className="mt-1 text-xs text-[var(--atria-primary)]/50">
                  {PORTAL_REQUEST_CONTENT_TYPE_LABELS[selected.contentType]} ·{" "}
                  {STATUS_LABELS[selected.status]} ·{" "}
                  {new Date(selected.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>

            {selected.description && (
              <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--atria-primary)]/80">
                {selected.description}
              </p>
            )}

            {selected.referenceLinks?.length > 0 && (
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
                        className="break-all text-sm text-[var(--atria-primary)] underline-offset-2 hover:underline"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
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
                  Nenhum comentário ainda. Inicie a conversa com a equipe.
                </p>
              ) : (
                selected.comments.map((entry) => (
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
                        {new Date(entry.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-[var(--atria-primary)]/80">
                      {entry.body}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={2}
                placeholder="Escreva um comentário..."
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
          </Card>
        ) : (
          <Card className="rounded-2xl border-dashed p-12 text-center text-sm text-[var(--atria-primary)]/50">
            Selecione uma solicitação para ver os detalhes.
          </Card>
        )}
      </div>

      <PortalRequestFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        actions={actions}
        onCreated={loadRequests}
      />
    </div>
  );
}
