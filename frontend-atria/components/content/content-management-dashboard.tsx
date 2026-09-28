"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Filter,
  List,
  MessageSquare,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClientName } from "@/components/ui/client-name";
import { ContentStatusBadge } from "@/components/content/content-status-badge";
import { PostFormDialog } from "@/components/content/post-form-dialog";
import { PublishingSchedule } from "@/components/creation/publishing-schedule";
import { MediaPreview } from "@/components/ui/media-preview";
import {
  CONTENT_STATUS_LABELS,
  formatContentDate,
  INSTAGRAM_PUBLISH_STATUS_LABELS,
} from "@/lib/content-utils";
import { resolveMediaUrl } from "@/lib/media-url";
import { toast } from "@/lib/toast";
import { clientsService, contentService } from "@/services";
import type {
  Client,
  ContentCalendarItem,
  ContentManagementBoard,
  ContentManagementPost,
  ContentPost,
  ContentPostStatus,
  CreationScheduleItem,
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

type ViewTab = "list" | "schedule";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function calendarToScheduleItems(
  items: ContentCalendarItem[],
): CreationScheduleItem[] {
  return items.map((item) => ({
    id: item.id,
    type: "post",
    title: item.title,
    clientId: null,
    clientName: item.clientName ?? "—",
    platform: item.platform,
    format: null,
    status: item.status,
    scheduledAt: item.scheduledDate,
    color: item.color,
  }));
}

export function ContentManagementDashboard() {
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get("clientId") ?? undefined;
  const shouldOpenCreate = searchParams.get("create") === "1";

  const [data, setData] = useState<ContentManagementBoard | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ContentPostStatus | "">("");
  const [clientFilter, setClientFilter] = useState(initialClientId ?? "");
  const [view, setView] = useState<ViewTab>("list");
  const [scheduleItems, setScheduleItems] = useState<CreationScheduleItem[]>(
    [],
  );
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(shouldOpenCreate);
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    clientsService.getClients().then(setClients).catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (shouldOpenCreate) {
      setCreateOpen(true);
    }
  }, [shouldOpenCreate]);

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

  const loadSchedule = useCallback(async () => {
    setScheduleLoading(true);
    try {
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + 21);
      const items = await contentService.getCalendar({
        from: from.toISOString(),
        to: to.toISOString(),
        clientId: clientFilter || undefined,
      });
      setScheduleItems(calendarToScheduleItems(items));
    } catch {
      setScheduleItems([]);
    } finally {
      setScheduleLoading(false);
    }
  }, [clientFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (view === "schedule") {
      void loadSchedule();
    }
  }, [view, loadSchedule]);

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

  function handleRefresh() {
    void loadData();
    if (view === "schedule") {
      void loadSchedule();
    }
  }

  function handlePostSaved() {
    handleRefresh();
    setEditingPost(null);
    setEditOpen(false);
    setCreateOpen(false);
  }

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
      if (view === "schedule") void loadSchedule();
    } catch {
      setData(previous);
      toast.error("Não foi possível atualizar o status.");
    }
  }

  async function openEdit(post: ContentManagementPost) {
    try {
      const full = await contentService.getPost(post.id);
      setEditingPost(full);
      setEditOpen(true);
    } catch {
      toast.error("Não foi possível carregar o post para edição.");
    }
  }

  async function handlePublishNow(postId: string) {
    try {
      await contentService.publishPostToInstagram(postId);
      toast.success("Publicação enviada ao Instagram.");
      handleRefresh();
    } catch {
      toast.error("Não foi possível publicar no Instagram.");
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
            Agendamento de posts
          </h1>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Crie, agende e acompanhe publicações — inclusive envio automático ao
            Instagram
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PostFormDialog
            clients={clients}
            defaultClientId={clientFilter || initialClientId}
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSuccess={handlePostSaved}
            trigger={false}
          />
          <Button
            className="bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]/90"
            onClick={() => setCreateOpen(true)}
          >
            Novo post
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="size-4" />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl border border-[var(--atria-primary)]/10 bg-white p-1">
        <button
          type="button"
          onClick={() => setView("list")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:flex-none ${
            view === "list"
              ? "bg-[var(--atria-primary)] text-white"
              : "text-[var(--atria-primary)]/70 hover:bg-[var(--atria-primary)]/5"
          }`}
        >
          <List className="size-4" />
          Lista
        </button>
        <button
          type="button"
          onClick={() => setView("schedule")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:flex-none ${
            view === "schedule"
              ? "bg-[var(--atria-primary)] text-white"
              : "text-[var(--atria-primary)]/70 hover:bg-[var(--atria-primary)]/5"
          }`}
        >
          <CalendarDays className="size-4" />
          Cronograma
        </button>
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
          {view === "list" && (
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
          )}
        </div>
      </Card>

      {view === "schedule" ? (
        scheduleLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
          </div>
        ) : (
          <PublishingSchedule items={scheduleItems} />
        )
      ) : !data || data.posts.length === 0 ? (
        <Card className="rounded-2xl border border-dashed border-[var(--atria-primary)]/20 p-12 text-center">
          <p className="text-sm text-[var(--atria-primary)]/50">
            Nenhum conteúdo encontrado com os filtros selecionados.
          </p>
          <Button
            className="mt-4 bg-[var(--atria-primary)] text-white"
            onClick={() => setCreateOpen(true)}
          >
            Criar primeiro post
          </Button>
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
                          resolveMediaUrl(post.attachments[0].url) ??
                          post.attachments[0].url
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
                      {post.publishToInstagram && post.publishStatus ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            post.publishStatus === "failed"
                              ? "bg-red-100 text-red-700"
                              : post.publishStatus === "published"
                                ? "bg-green-100 text-green-700"
                                : "bg-[var(--atria-accent)]/30 text-[var(--atria-primary)]"
                          }`}
                        >
                          {INSTAGRAM_PUBLISH_STATUS_LABELS[post.publishStatus] ??
                            post.publishStatus}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--atria-primary)]/50">
                      <ClientName>{post.client.companyName}</ClientName>
                      {post.scheduledDate
                        ? ` · ${formatContentDate(post.scheduledDate)}`
                        : ` · Atualizado ${formatContentDate(post.updatedAt)}`}
                    </p>
                    {post.publishError && (
                      <p className="mt-1 text-xs text-red-600">
                        Instagram: {post.publishError}
                      </p>
                    )}
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

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => void openEdit(post)}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </Button>
                  {post.publishToInstagram &&
                    post.platform === "instagram" &&
                    post.publishStatus !== "published" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handlePublishNow(post.id)}
                      >
                        Publicar agora (IG)
                      </Button>
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

      {editingPost && (
        <PostFormDialog
          clients={clients}
          post={editingPost}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEditingPost(null);
          }}
          onSuccess={handlePostSaved}
          trigger={false}
        />
      )}
    </div>
  );
}
