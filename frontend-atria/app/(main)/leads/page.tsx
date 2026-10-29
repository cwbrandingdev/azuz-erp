"use client";

import { useEffect, useState } from "react";
import { CompanySearchPanel } from "@/components/leads/company-search-panel";
import { LeadsSearchPanel } from "@/components/leads/leads-search-panel";
import {
  LeadsProspectingTabs,
  type LeadsProspectingMode,
} from "@/components/leads/leads-prospecting-tabs";
import {
  readPersistedProspectingMode,
  writePersistedProspectingMode,
} from "@/lib/lead-prospecting-persistence";

const PAGE_COPY: Record<
  LeadsProspectingMode,
  { title: string; description: string }
> = {
  b2b: {
    title: "Buscar empresas",
    description:
      "Informe o CNAE, escolha a cidade e veja empresas da Receita já ranqueadas por fit comercial.",
  },
  maps: {
    title: "Buscar empresas",
    description:
      "Informe a categoria, escolha a cidade e veja estabelecimentos do Google Maps para adicionar aos seus leads.",
  },
};

export default function LeadsPage() {
  const [mode, setMode] = useState<LeadsProspectingMode>(
    () => readPersistedProspectingMode() ?? "b2b",
  );
  const copy = PAGE_COPY[mode];

  useEffect(() => {
    writePersistedProspectingMode(mode);
  }, [mode]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--atria-primary)] sm:text-2xl">
            {copy.title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--atria-primary)]/50">
            {copy.description}
          </p>
        </div>

        <LeadsProspectingTabs activeMode={mode} onChange={setMode} />
      </div>

      <div className={mode === "b2b" ? "contents" : "hidden"}>
        <CompanySearchPanel />
      </div>
      <div className={mode === "maps" ? "contents" : "hidden"}>
        <LeadsSearchPanel />
      </div>
    </div>
  );
}
