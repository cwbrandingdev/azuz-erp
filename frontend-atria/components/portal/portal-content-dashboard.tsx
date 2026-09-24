"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Inbox, Loader2 } from "lucide-react";
import { PortalApprovalDetailPanel } from "@/components/portal/portal-approval-detail-panel";
import { PortalApprovalListItem } from "@/components/portal/portal-approval-list-item";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { portalService } from "@/services";
import { resolvePortalAssetUrl } from "@/services/portal.service";
import type {
  ContentPostStatus,
  PortalContentPipelineItem,
} from "@/services/types";
import type { PortalActionHandlers } from "./portal-actions";

type ApprovalStatusFilter = "pending" | "adjustment" | "approved";

const FILTER_TABS: Array<{
  id: ApprovalStatusFilter;
  label: string;
  statuses: ContentPostStatus[];
}> = [
  {
    id: "pending",
    label: "Para Aprovar",
    statuses: ["pending_approval"],
  },
  {
    id: "adjustment",
    label: "Solicitado Ajuste",
    statuses: ["rejected"],
  },
  {
    id: "approved",
    label: "Aprovado",
    statuses: ["approved", "scheduled", "published"],
  },
];

const STATUS_ORDER: Record<string, number> = {
  pending_approval: 0,
  rejected: 1,
  approved: 2,
  scheduled: 3,
  published: 4,
};

interface PortalContentDashboardProps {
  pipeline: PortalContentPipelineItem[];
  onRefresh: () => void;
  onOpenRequests?: () => void;
  actions?: Pick<
    PortalActionHandlers,
    | "approvePost"
    | "rejectPost"
    | "resolveAssetUrl"
    | "getDeliverableFullView"
    | "listDeliverables"
    | "reviseDeliverableItem"
  >;
}

export function PortalContentDashboard({
  pipeline,
  onRefresh,
  onOpenRequests,
  actions,
}: PortalContentDashboardProps) {
  const approveAction = actions?.approvePost ?? portalService.approvePortalPost;
  const rejectAction = actions?.rejectPost ?? portalService.rejectPortalPost;
  const resolveAssetUrl = actions?.resolveAssetUrl ?? resolvePortalAssetUrl;
  const getDeliverableFullView =
    actions?.getDeliverableFullView ?? portalService.getDeliverableFullView;
  const reviseDeliverableItem =
    actions?.reviseDeliverableItem ?? portalService.reviseDeliverableItem;

  const [statusFilter, setStatusFilter] =
    useState<ApprovalStatusFilter>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sortedPipeline = useMemo(
    () =>
      [...pipeline].sort((a, b) => {
        const statusDiff =
          (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
        if (statusDiff !== 0) return statusDiff;
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }),
    [pipeline],
  );

  const filteredPipeline = useMemo(() => {
    const activeTab = FILTER_TABS.find((tab) => tab.id === statusFilter);
    if (!activeTab) return sortedPipeline;
    return sortedPipeline.filter((item) =>
      activeTab.statuses.includes(item.status),
    );
  }, [sortedPipeline, statusFilter]);

  const filterCounts = useMemo(
    () =>
      Object.fromEntries(
        FILTER_TABS.map((tab) => [
          tab.id,
          sortedPipeline.filter((item) => tab.statuses.includes(item.status))
            .length,
        ]),
      ) as Record<ApprovalStatusFilter, number>,
    [sortedPipeline],
  );

  const pendingCount = filterCounts.pending;

  const selectedPost =
    filteredPipeline.find((item) => item.id === selectedId) ??
    filteredPipeline[0] ??
    null;

  useEffect(() => {
    if (filteredPipeline.length === 0) {
      setSelectedId(null);
      return;
    }
    if (
      !selectedId ||
      !filteredPipeline.some((item) => item.id === selectedId)
    ) {
      setSelectedId(filteredPipeline[0].id);
    }
  }, [filteredPipeline, selectedId]);

  const contentActions = useMemo(
    () => ({
      approvePost: approveAction,
      rejectPost: rejectAction,
      getDeliverableFullView,
      reviseDeliverableItem,
      resolveAssetUrl,
    }),
    [
      approveAction,
      rejectAction,
      getDeliverableFullView,
      reviseDeliverableItem,
      resolveAssetUrl,
    ],
  );

  const emptyMessages: Record<ApprovalStatusFilter, string> = {
    pending:
      "Não há nada para aprovar agora, que tal fazer uma solicitação?",
    adjustment: "Nenhum conteúdo com ajuste solicitado no momento.",
    approved: "Nenhum conteúdo aprovado ainda.",
  };

  return (
    <div className="flex flex-col gap-6">
      <div data-tour="portal-content-header" className="flex items-start gap-4">
        <div className="rounded-2xl border border-[var(--atria-primary)]/10 bg-[var(--atria-accent)]/20 p-3 text-[var(--atria-primary)]">
          <ClipboardCheck className="size-6" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
              Aprovação de Conteúdo
            </h1>
            <p className="text-sm text-[var(--atria-primary)]/50">
              Revise as entregas, confira a legenda e aprove ou solicite ajustes
            </p>
          </div>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
              {pendingCount} pendente{pendingCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      <div data-tour="portal-content-filters" className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition",
              statusFilter === tab.id
                ? "bg-[var(--atria-primary)] text-white"
                : "bg-white text-[var(--atria-primary)]/70 ring-1 ring-[var(--atria-primary)]/10 hover:bg-[var(--atria-primary)]/5",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                statusFilter === tab.id
                  ? "bg-white/20 text-white"
                  : "bg-[var(--atria-primary)]/8 text-[var(--atria-primary)]",
              )}
            >
              {filterCounts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {filteredPipeline.length === 0 ? (
        <Card data-tour="portal-content-workspace" className="rounded-2xl border-[var(--atria-primary)]/10 bg-white p-12 text-center">
          <ClipboardCheck className="mx-auto mb-3 size-8 text-[var(--atria-primary)]/30" />
          <p className="font-medium text-[var(--atria-primary)]">
            {emptyMessages[statusFilter]}
          </p>
          {statusFilter === "pending" && onOpenRequests && (
            <Button
              type="button"
              className="mt-5 gap-2 bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]/90"
              onClick={onOpenRequests}
            >
              <Inbox className="size-4" />
              Fazer uma solicitação
            </Button>
          )}
        </Card>
      ) : (
        <div data-tour="portal-content-workspace" className="grid min-h-[70vh] gap-4 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col gap-2 xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto xl:pr-1">
            {filteredPipeline.map((post) => (
              <PortalApprovalListItem
                key={post.id}
                post={post}
                selected={selectedPost?.id === post.id}
                onSelect={() => setSelectedId(post.id)}
              />
            ))}
          </div>

          {selectedPost ? (
            <div className="min-h-0 xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto">
              <PortalApprovalDetailPanel
                key={selectedPost.id}
                post={selectedPost}
                onRefresh={onRefresh}
                actions={contentActions}
              />
            </div>
          ) : (
            <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-dashed border-[var(--atria-primary)]/15 bg-white">
              <Loader2 className="size-8 animate-spin text-[var(--atria-primary)]" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
