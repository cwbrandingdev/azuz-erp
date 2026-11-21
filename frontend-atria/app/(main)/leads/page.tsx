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

export default function LeadsPage() {
  const [mode, setMode] = useState<LeadsProspectingMode>(
    () => readPersistedProspectingMode() ?? "b2b",
  );

  useEffect(() => {
    writePersistedProspectingMode(mode);
  }, [mode]);

  const tabs = (
    <LeadsProspectingTabs activeMode={mode} onChange={setMode} />
  );

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-0 flex-col lg:h-[calc(100dvh-5.5rem)]">
      <div
        className={
          mode === "b2b" ? "flex min-h-0 flex-1 flex-col" : "hidden"
        }
      >
        <CompanySearchPanel modeTabs={tabs} />
      </div>
      <div
        className={
          mode === "maps" ? "flex min-h-0 flex-1 flex-col" : "hidden"
        }
      >
        <LeadsSearchPanel modeTabs={tabs} />
      </div>
    </div>
  );
}
