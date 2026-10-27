"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Filter,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClientName } from "@/components/ui/client-name";
import { ContentStatusBadge } from "@/components/content/content-status-badge";
import { MediaPreview } from "@/components/ui/media-preview";
import {
  CONTENT_STATUS_LABELS,
  formatContentDate,
} from "@/lib/content-utils";
import { resolveDisplayMediaUrl } from "@/lib/media-url";
import { toast } from "@/lib/toast";
import { clientsService, contentService } from "@/services";
import type {
  Client,
  ContentManagementBoard,
  ContentPostStatus,
} from "@/services/types";

const EDITABLE_STATUS_OPTIONS: ContentPostStatus[] = [
  "draft",
  "scheduled",
  "published",
];

const FILTER_STATUS_OPTIONS: ContentPostStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "scheduled",
  "published",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ContentManagementDashboard() {
  const [data, setData] = useState<ContentManagementBoard | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ContentPostStatus | "">("");
  const [clientFilter, setClientFilter] = useState("");

  useEffect(() => {
    clientsService.getClients().then(setClients).catch(() => setClients([]));
  }, []);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const board = await contentService.getManagementBoard({
        clientId: clientFilter || undefined,
        status: statusFilter || undefined,
      });
      setData(board);
    } catch {
      if (!silent) setData(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [clientFilter, statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const kpiCards = useMemo(() => {
    if (!data) return [];
    const { overview } = data;
    return [
      { label: "Rascunhos", value: overview.drafts },
      { label: "Em aprovação", value: overview.pendingApproval },
      { label: "Agendados", value: overview.scheduled },
      { label: "Publicados", value: overview.published },
    ];
  }, [data]);

  async function handleStatusChange(postId: string, status: ContentPostStatus) {
    const previous = data;
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        posts: current.posts.map((post) =>
          post.id === postId ? { ...post, status } : post,
        ),
      };
    });

    try {
      await contentService.updatePost(postId, { status });
      toast.success("Status atualizado.");
      void loadData(true);
    } catch {
      setData(previous);
      toast.error("Não foi possível atualizar o status.");
    }
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
            Gestão de Conteúdo
          </h1>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Acompanhe status, aprovações do cliente e atualize o progresso
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadData()}
          className="gap-2"
        >
          <RefreshCw className="size-4" />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card
            key={kpi.label}
            className="rounded-2xl border-[var(--atria-primary)]/10 bg-white p-4"
          >
            <p className="text-xs text-[var(--atria-primary)]/50">{kpi.label}</p>
            <p className="mt-1 text-2xl font-bold text-[var(--atria-primary)]">
              {kpi.value}
            </p>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border-[var(--atria-primary)]/10 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="size-4 text-[var(--atria-primary)]/50" />
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="h-9 min-w-[180px] rounded-lg border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Todos os clientes</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.companyName}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ContentPostStatus | "")
            }
            className="h-9 min-w-[160px] rounded-lg border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Todos os status</option>
            {FILTER_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {CONTENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {!data || data.posts.length === 0 ? (
        <Card className="rounded-2xl border border-dashed border-[var(--atria-primary)]/20 p-12 text-center">
          <p className="text-sm text-[var(--atria-primary)]/50">
            Nenhum conteúdo encontrado com os filtros selecionados.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {data.posts.map((post) => (
            <Card
              key={post.id}
              className="rounded-2xl border-[var(--atria-primary)]/10 bg-white p-4 sm:p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 flex-1 gap-3">
                  {post.attachments[0] ? (
                    <div className="size-16 shrink-0 overflow-hidden rounded-xl">
                      <MediaPreview
                        url={
                          resolveDisplayMediaUrl(
                            post.attachments[0].previewUrl,
                            post.attachments[0].url,
                          ) ?? post.attachments[0].url
                        }
                        mimeType={post.attachments[0].mimeType}
                        name={post.attachments[0].name}
                        className="size-16 object-cover"
                      />
                    </div>
                  ) : (
                    <Avatar className="size-10 shrink-0">
                      <AvatarImage src={post.client.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-[var(--atria-accent)]/30 text-xs text-[var(--atria-primary)]">
                        {getInitials(post.client.companyName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/content/${post.id}`}
                        className="font-semibold text-[var(--atria-primary)] hover:underline"
                      >
                        {post.title}
                      </Link>
                      <ContentStatusBadge status={post.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--atria-primary)]/50">
                      <ClientName>{post.client.companyName}</ClientName>
                      {post.scheduledDate
                        ? ` · ${formatContentDate(post.scheduledDate)}`
                        : ` · Atualizado ${formatContentDate(post.updatedAt)}`}
                    </p>
                    {post.copy && (
                      <p className="mt-2 line-clamp-2 text-sm text-[var(--atria-primary)]/70">
                        {post.copy}
                      </p>
                    )}
                    {post.latestFeedback && (
                      <div className="mt-3 rounded-xl border border-red-100 bg-red-50/60 p-3">
                        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-red-700">
                          <MessageSquare className="size-3.5" />
                          Feedback do cliente
                        </div>
                        <p className="text-sm text-red-900/85">
                          {post.latestFeedback.comment}
                        </p>
                        <p className="mt-1 text-[10px] text-red-700/60">
                          {formatContentDate(post.latestFeedback.createdAt)}
                          {post.latestFeedback.user?.name
                            ? ` · ${post.latestFeedback.user.name}`
                            : ""}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                  {EDITABLE_STATUS_OPTIONS.includes(post.status) ? (
                    <select
                      value={post.status}
                      onChange={(e) =>
                        void handleStatusChange(
                          post.id,
                          e.target.value as ContentPostStatus,
                        )
                      }
                      className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
                    >
                      {EDITABLE_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {CONTENT_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <ContentStatusBadge status={post.status} />
                  )}
                  <Link href={`/content/${post.id}`}>
                    <Button variant="outline" size="sm" className="gap-1">
                      Revisar
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
