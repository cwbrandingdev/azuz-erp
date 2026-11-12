"use client";

import { AppToast, AppToastBadge } from "@/components/ui/app-toast";

interface FinanceDueToastProps {
  dueCount: number;
  overdueCount: number;
  onOpen: () => void;
  onClose: () => void;
}

function plural(count: number, singular: string, pluralWord: string) {
  return `${count} ${count === 1 ? singular : pluralWord}`;
}

function buildMessage(dueCount: number, overdueCount: number) {
  const parts: string[] = [];
  if (dueCount > 0) {
    parts.push(
      `${plural(dueCount, "conta", "contas")} ${dueCount === 1 ? "vence" : "vencem"} hoje`,
    );
  }
  if (overdueCount > 0) {
    parts.push(`${plural(overdueCount, "conta", "contas")} em atraso`);
  }
  return parts.join(" e ");
}

// Toast de contas vencendo/atrasadas, montado sobre o cartão padrão do sistema.
export function FinanceDueToast({
  dueCount,
  overdueCount,
  onOpen,
  onClose,
}: FinanceDueToastProps) {
  return (
    <AppToast
      variant="warning"
      title="Atenção ao financeiro"
      description={`${buildMessage(dueCount, overdueCount)}. Revise e marque os pagamentos concluídos.`}
      badges={
        <>
          {dueCount > 0 && (
            <AppToastBadge tone="amber">{dueCount} hoje</AppToastBadge>
          )}
          {overdueCount > 0 && (
            <AppToastBadge tone="red">{overdueCount} em atraso</AppToastBadge>
          )}
        </>
      }
      action={{ label: "Abrir financeiro", onClick: onOpen }}
      onClose={onClose}
    />
  );
}
