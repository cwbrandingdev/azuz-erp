"use client";

import Link from "next/link";
import { ArrowRight, KanbanSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface PortalCrmPanelProps {
  companyName: string;
}

export function PortalCrmPanel({ companyName }: PortalCrmPanelProps) {
  return (
    <Card data-tour="portal-crm-card" className="rounded-2xl border-[var(--atria-primary)]/10 bg-white p-8 shadow-sm">
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--atria-accent)]/20 text-[var(--atria-primary)]">
          <KanbanSquare className="size-7" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[var(--atria-primary)]">
            CRM ativo para {companyName}
          </h3>
          <p className="mt-2 max-w-lg text-sm text-[var(--atria-primary)]/55">
            Acompanhe o funil comercial da sua empresa. Você pode ver os
            comentários dos leads e movê-los para qualquer etapa.
          </p>
        </div>
        <Button
          className="shrink-0 bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]/90"
          render={<Link href="/client-portal/crm" />}
        >
          Abrir Kanban
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
