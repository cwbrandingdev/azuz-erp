"use client";

import type { InstagramPublishReadiness } from "@/services/types";

export function MetaInstagramReadinessPanel({
  readiness,
  loading,
}: {
  readiness: InstagramPublishReadiness | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <p className="text-xs text-[var(--atria-primary)]/50">
        Verificando publicação no Instagram…
      </p>
    );
  }

  if (!readiness) {
    return null;
  }

  if (
    readiness.ready &&
    readiness.warnings.length === 0 &&
    readiness.blockers.length === 0
  ) {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
        Pronto para publicar no Instagram após aprovação do cliente.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.03] px-3 py-2">
      {readiness.blockers.map((item) => (
        <p key={item.code} className="text-xs font-medium text-red-700">
          {item.message}
        </p>
      ))}
      {readiness.warnings.map((item) => (
        <p key={item.code} className="text-xs text-amber-800">
          {item.message}
        </p>
      ))}
      {readiness.ready && readiness.warnings.length > 0 && (
        <p className="text-xs text-emerald-800">
          Nenhum bloqueio — revise os avisos acima.
        </p>
      )}
    </div>
  );
}
