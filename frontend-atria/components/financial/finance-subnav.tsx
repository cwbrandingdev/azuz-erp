"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--atria-primary)]/10 bg-white p-1">
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
  );
}
