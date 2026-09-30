"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Loader2, RefreshCw } from "lucide-react";
import { PublishingSchedule } from "@/components/creation/publishing-schedule";
import { Button } from "@/components/ui/button";
import { creationService } from "@/services";
import type { CreationScheduleItem } from "@/services/types";
import { toast } from "@/lib/toast";

export function PublishingSchedulePage() {
  const [items, setItems] = useState<CreationScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await creationService.getCommandCenter();
      setItems(data.publishingSchedule);
    } catch {
      toast.error("Não foi possível carregar o cronograma");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex size-11 items-center justify-center rounded-2xl bg-[var(--atria-primary)]/10 text-[var(--atria-primary)]"
          >
            <CalendarClock className="size-6" strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--atria-primary)]">
              Cronograma
            </h1>
            <p className="text-sm text-[var(--atria-primary)]/60">
              Publicações e eventos de go-live nas próximas semanas — alinhado à
              data de publicação das tarefas e posts aprovados.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void load()}
        >
          {loading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 size-4" />
          )}
          Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-[var(--atria-primary)]/60">
          <Loader2 className="size-5 animate-spin" />
          Carregando cronograma…
        </div>
      ) : (
        <PublishingSchedule items={items} />
      )}
    </div>
  );
}
