"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreationDayView } from "@/components/creation/creation-day-view";
import { CreationDeliverableModal } from "@/components/creation/creation-deliverable-modal";
import { useTaskDetail } from "@/components/kanban/task-detail-provider";
import { CreationMonthView } from "@/components/creation/creation-month-view";
import { CreationViewToolbar } from "@/components/creation/creation-view-toolbar";
import { CreationWeekView } from "@/components/creation/creation-week-view";
import { useCreationPipeline } from "@/hooks/use-creation-pipeline";
import { useInvalidateTasks } from "@/hooks/use-task-mutations";
import { usePermissions } from "@/hooks/use-permissions";
import {
  getPeriodBounds,
  type CreationPeriod,
} from "@/lib/creation-date-utils";
import { toast } from "@/lib/toast";
import { clientsService, creationService, ApiError } from "@/services";
import type {
  Client,
  CreationPipelineItem,
} from "@/services/types";

function parsePeriod(value: string | null): CreationPeriod {
  if (value === "day" || value === "month") return value;
  return "week";
}

function parseAnchor(value: string | null) {
  if (!value) return new Date();
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function CreationDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invalidateTasks = useInvalidateTasks();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState(searchParams.get("clientId") ?? "");
  const [period, setPeriod] = useState<CreationPeriod>(
    parsePeriod(searchParams.get("period")),
  );
  const [anchor, setAnchor] = useState<Date>(
    parseAnchor(searchParams.get("date")),
  );
  const { openTaskById } = useTaskDetail();
  const { canPerformInternalApproval } = usePermissions();
  const [createOpen, setCreateOpen] = useState(
    searchParams.get("create") === "1",
  );
  const [optimisticItems, setOptimisticItems] = useState<
    CreationPipelineItem[] | null
  >(null);

  const periodBounds = useMemo(
    () => getPeriodBounds(period, anchor),
    [period, anchor],
  );

  const {
    data: pipeline,
    isLoading: loading,
    refetch: refetchPipeline,
  } = useCreationPipeline(clientId || null, {
    from: periodBounds.from.toISOString(),
    to: periodBounds.to.toISOString(),
  });

  useEffect(() => {
    clientsService
      .getClients()
      .then((list) => {
        setClients(list);
        if (!clientId && list[0]) {
          setClientId(list[0].id);
        }
      })
      .catch(() => setClients([]));
  }, [clientId]);

  useEffect(() => {
    const fromUrl = searchParams.get("clientId");
    if (fromUrl) setClientId(fromUrl);
    setPeriod(parsePeriod(searchParams.get("period")));
    setAnchor(parseAnchor(searchParams.get("date")));
    if (searchParams.get("create") === "1") setCreateOpen(true);
  }, [searchParams]);

  useEffect(() => {
    setOptimisticItems(null);
  }, [pipeline]);

  const syncUrl = useCallback(
    (next: {
      clientId?: string;
      period?: CreationPeriod;
      anchor?: Date;
      create?: boolean;
    }) => {
      const params = new URLSearchParams();
      const nextClientId = next.clientId ?? clientId;
      const nextPeriod = next.period ?? period;
      const nextAnchor = next.anchor ?? anchor;

      if (nextClientId) params.set("clientId", nextClientId);
      params.set("period", nextPeriod);
      params.set("date", nextAnchor.toISOString().split("T")[0]);
      if (next.create) params.set("create", "1");

      router.replace(`/creation?${params.toString()}`);
    },
    [anchor, clientId, period, router],
  );

  function updatePipelineItem(
    item: CreationPipelineItem,
    patch: Partial<CreationPipelineItem>,
  ) {
    const base = optimisticItems ?? pipeline?.items ?? [];
    setOptimisticItems(
      base.map((entry) =>
        `${entry.source}-${entry.id}` === `${item.source}-${item.id}`
          ? { ...entry, ...patch }
          : entry,
      ),
    );
  }

  async function handleInternalReview(
    item: CreationPipelineItem,
    status: "pending" | "approved" | "rejected",
  ) {
    let note: string | undefined;

    if (status === "rejected") {
      const reason = window.prompt("Informe o motivo da rejeição interna:");
      if (!reason?.trim()) {
        toast.error("Motivo da rejeição é obrigatório.");
        return;
      }
      note = reason.trim();
    }

    const previous = optimisticItems ?? pipeline?.items ?? [];
    updatePipelineItem(item, { internalReviewStatus: status });

    try {
      await creationService.updatePipelineInternalReview(
        item.source,
        item.id,
        status,
        note,
      );
      toast.success("Revisão interna atualizada");
      invalidateTasks();
      void refetchPipeline();
    } catch (err) {
      setOptimisticItems(previous);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar a revisão interna.",
      );
    }
  }

  const items = optimisticItems ?? pipeline?.items ?? [];
  const handlePipelineInternalReview = canPerformInternalApproval()
    ? (item: CreationPipelineItem, status: "pending" | "approved" | "rejected") =>
        void handleInternalReview(item, status)
    : undefined;

  return (
    <>
      <div className="flex flex-col gap-6 pb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
            Criação
          </h1>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Visualize posts e compromissos por dia, semana ou mês
          </p>
        </div>

        <CreationViewToolbar
          clients={clients}
          clientId={clientId}
          period={period}
          anchor={anchor}
          onClientChange={(nextClientId) => {
            setClientId(nextClientId);
            syncUrl({ clientId: nextClientId, create: false });
          }}
          onPeriodChange={(nextPeriod) => {
            setPeriod(nextPeriod);
            syncUrl({ period: nextPeriod });
          }}
          onAnchorChange={(nextAnchor) => {
            setAnchor(nextAnchor);
            syncUrl({ anchor: nextAnchor });
          }}
          onCreateClick={() => setCreateOpen(true)}
        />

        {!clientId ? (
          <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/20 px-6 py-16 text-center">
            <p className="text-sm text-[var(--atria-primary)]/50">
              Selecione um cliente para ver os itens.
            </p>
          </div>
        ) : loading && !pipeline ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <div className="size-7 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
          </div>
        ) : (
          <>
            {period === "day" && (
              <CreationDayView
                anchor={anchor}
                items={items}
                onInternalReview={handlePipelineInternalReview}
                onOpenTask={(id) => void openTaskById(id)}
              />
            )}
            {period === "week" && (
              <CreationWeekView
                anchor={anchor}
                items={items}
                onInternalReview={handlePipelineInternalReview}
                onOpenTask={(id) => void openTaskById(id)}
              />
            )}
            {period === "month" && (
              <CreationMonthView
                anchor={anchor}
                items={items}
                onInternalReview={handlePipelineInternalReview}
                onOpenTask={(id) => void openTaskById(id)}
              />
            )}
          </>
        )}
      </div>

      {clientId && (
        <CreationDeliverableModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          clientId={clientId}
          onSuccess={() => {
            invalidateTasks();
            void refetchPipeline();
          }}
        />
      )}
    </>
  );
}
