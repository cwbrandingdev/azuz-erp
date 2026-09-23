"use client";

import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useFinanceTutorial } from "@/components/financial/finance-tutorial-provider";
import { pathnameToFinanceTutorialTab } from "@/components/financial/finance-tutorial-steps";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/financial", label: "Dashboard" },
  { href: "/financial/lancamentos", label: "Lançamentos" },
  { href: "/financial/movimentos-pendentes", label: "Mov. Pendentes" },
  { href: "/financial/fluxo-de-caixa", label: "Fluxo de Caixa" },
  { href: "/financial/fluxo-projetado", label: "FC Projetado" },
  { href: "/financial/dre", label: "DRE" },
  { href: "/financial/plano-de-contas", label: "Plano de Contas" },
];

export function FinanceSubnav() {
  const pathname = usePathname();
  const { startTour } = useFinanceTutorial();
  const tabId = pathnameToFinanceTutorialTab(pathname);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <nav
        data-tour="finance-subnav"
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-xl border border-[var(--atria-primary)]/10 bg-white p-1"
      >
      {LINKS.map((link) => {
        const active =
          link.href === "/financial"
            ? pathname === "/financial"
            : pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--atria-primary)] text-white"
                : "text-[var(--atria-primary)]/70 hover:bg-[var(--atria-primary)]/5",
            )}
          >
            {link.label}
          </Link>
        );
      })}
      </nav>
      {tabId ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 rounded-lg border-violet-200 text-violet-700 hover:bg-violet-50"
          onClick={() => startTour(tabId, { force: true })}
        >
          <HelpCircle className="size-4" />
          Tutorial
        </Button>
      ) : null}
    </div>
  );
}
