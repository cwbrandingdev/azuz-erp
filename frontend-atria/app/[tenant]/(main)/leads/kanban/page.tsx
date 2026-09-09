"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LeadsKanbanBoard } from "@/components/leads/leads-kanban-board";

function LeadsKanbanPageContent() {
  const searchParams = useSearchParams();
  const organizationId = searchParams.get("organizationId")?.trim() || undefined;

  return <LeadsKanbanBoard initialOrganizationId={organizationId} />;
}

export default function LeadsKanbanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
        </div>
      }
    >
      <LeadsKanbanPageContent />
    </Suspense>
  );
}
