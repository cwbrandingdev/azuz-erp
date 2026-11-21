"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ProspectingLeadCard } from "@/components/leads/prospecting-lead-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Lead } from "@/services/types";

const CLIENT_PAGE_SIZE = 25;

function clampPage(value: number, totalPages: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(totalPages, Math.max(1, Math.trunc(value)));
}

interface ProspectingLeadsListProps {
  leads: Lead[];
  loading?: boolean;
  /** 0–100 shown while loading a search (keeps the user oriented). */
  searchProgress?: number | null;
  emptyMessage?: string;
  addingKanbanId?: string | null;
  showOpenedAt?: boolean;
  paginationMode?: "client" | "server";
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onAddToKanban: (lead: Lead) => void;
}

export function ProspectingLeadsList({
  leads,
  loading,
  searchProgress = null,
  emptyMessage = "Faça uma busca para ver as empresas aqui.",
  addingKanbanId,
  showOpenedAt = false,
  paginationMode = "client",
  page: controlledPage,
  pageSize: controlledPageSize,
  totalCount: controlledTotalCount,
  onPageChange,
  onAddToKanban,
}: ProspectingLeadsListProps) {
  const isServer = paginationMode === "server";
  const [clientPage, setClientPage] = useState(1);
  const [pageDraft, setPageDraft] = useState("1");

  const pageSize = isServer
    ? (controlledPageSize ?? CLIENT_PAGE_SIZE)
    : CLIENT_PAGE_SIZE;
  const totalCount = isServer
    ? (controlledTotalCount ?? leads.length)
    : leads.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = isServer
    ? clampPage(controlledPage ?? 1, totalPages)
    : clientPage;

  useEffect(() => {
    if (!isServer) {
      setClientPage(1);
      setPageDraft("1");
    }
  }, [leads, isServer]);

  useEffect(() => {
    if (isServer) {
      setPageDraft(String(page));
      return;
    }
    setClientPage((current) => {
      const next = clampPage(current, totalPages);
      setPageDraft(String(next));
      return next;
    });
  }, [isServer, page, totalPages]);

  const paginatedLeads = useMemo(() => {
    if (isServer) {
      return leads;
    }
    const start = (page - 1) * pageSize;
    return leads.slice(start, start + pageSize);
  }, [isServer, leads, page, pageSize]);

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  function goToPage(next: number) {
    const clamped = clampPage(next, totalPages);
    setPageDraft(String(clamped));
    if (isServer) {
      onPageChange?.(clamped);
      return;
    }
    setClientPage(clamped);
  }

  function commitPageDraft(value: string) {
    const parsed = Number.parseInt(value.replace(/\D/g, ""), 10);
    goToPage(Number.isFinite(parsed) ? parsed : page);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[var(--atria-primary)]/10 bg-white/90 px-4 py-4 backdrop-blur-md">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--atria-primary)]/65">
            {totalCount === 0
              ? "Nenhuma empresa"
              : `${rangeStart}–${rangeEnd} de ${totalCount}`}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => goToPage(page - 1)}
              className="h-14 gap-2 px-5 text-base font-semibold"
            >
              <ChevronLeft className="size-6" />
              Voltar página
            </Button>

            <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--atria-primary)]/15 bg-white px-3 py-2">
              <label
                htmlFor="prospecting-page-selector"
                className="text-sm font-medium whitespace-nowrap text-[var(--atria-primary)]"
              >
                Página
              </label>
              <Input
                id="prospecting-page-selector"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pageDraft}
                disabled={loading || totalCount === 0}
                onChange={(event) => setPageDraft(event.target.value)}
                onBlur={(event) => commitPageDraft(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitPageDraft(event.currentTarget.value);
                  }
                }}
                aria-label={`Ir para a página, de 1 a ${totalPages}`}
                className="h-12 w-20 text-center text-lg font-semibold"
              />
              <span className="text-sm whitespace-nowrap text-[var(--atria-primary)]/60">
                de {totalPages}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={page >= totalPages || loading || totalCount === 0}
              onClick={() => goToPage(page + 1)}
              className="h-14 gap-2 px-5 text-base font-semibold"
            >
              Próxima página
              <ChevronRight className="size-6" />
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex min-h-40 items-center justify-center rounded-2xl border border-[var(--atria-primary)]/10 bg-white/50 px-6">
            <div className="flex w-full max-w-sm flex-col items-center gap-3 text-sm text-[var(--atria-primary)]/60">
              <div className="flex items-center gap-3">
                <Loader2 className="size-5 animate-spin" />
                <span>
                  Buscando empresas
                  {typeof searchProgress === "number"
                    ? `… ${Math.round(searchProgress)}%`
                    : "…"}
                </span>
              </div>
              {typeof searchProgress === "number" ? (
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-[var(--atria-primary)]/10"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(searchProgress)}
                  aria-label="Progresso da busca"
                >
                  <div
                    className="h-full rounded-full bg-[var(--atria-primary)] transition-[width] duration-200 ease-out"
                    style={{
                      width: `${Math.min(100, Math.max(0, searchProgress))}%`,
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {!loading && totalCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 px-6 py-12 text-center text-sm text-[var(--atria-primary)]/50">
            {emptyMessage}
          </div>
        ) : null}

        {!loading && paginatedLeads.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedLeads.map((lead) => (
              <ProspectingLeadCard
                key={lead.id}
                lead={lead}
                addingKanbanId={addingKanbanId}
                showOpenedAt={showOpenedAt}
                onAddToKanban={onAddToKanban}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
