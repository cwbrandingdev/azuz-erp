"use client";

import { CompanySearchPanel } from "@/components/leads/company-search-panel";

export default function LeadsPage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--atria-primary)] sm:text-2xl">
          Buscar empresas
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--atria-primary)]/50">
          Informe o tipo de negócio ou código CNAE, escolha a cidade e veja no
          mapa as empresas encontradas para adicionar aos seus leads.
        </p>
      </div>

      <CompanySearchPanel />
    </div>
  );
}
