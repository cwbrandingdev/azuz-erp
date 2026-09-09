"use client";

import { LeadsSearchPanel } from "@/components/leads/leads-search-panel";

export default function LeadsPage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--atria-primary)] sm:text-2xl">
          Prospecção de Leads
        </h1>
        <p className="mt-1 text-sm text-[var(--atria-primary)]/50">
          Extraia e enriqueça potenciais clientes do Google Maps por cidade,
          categoria e bairro
        </p>
      </div>

      <LeadsSearchPanel />
    </div>
  );
}
