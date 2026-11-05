import { Activity } from "lucide-react";
import { ProductivityReport } from "@/components/productivity/productivity-report";

export default function ProductivityPage() {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-center gap-4">
        <div className="rounded-2xl border border-[var(--atria-primary)]/40 bg-[var(--atria-primary)] p-3 text-white">
          <Activity className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
            Produtividade
          </h1>
          <p className="text-sm font-medium text-[var(--atria-primary)]/80">
            O que cada pessoa fez no período: ligações, mensagens, leads,
            tarefas e retorno do portal.
          </p>
        </div>
      </div>
      <ProductivityReport />
    </div>
  );
}
