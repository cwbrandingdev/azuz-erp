"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { canAccessRoute } from "@/lib/navigation-access";

const links = [
  { href: "/settings/navigation", label: "Configurações" },
  { href: "/settings/branding", label: "Identidade" },
  { href: "/settings/appearance", label: "Aparência" },
  { href: "/settings/users", label: "Usuários" },
  { href: "/settings/api-integrations", label: "Integrações / APIs" },
  { href: "/settings/client-sdr", label: "SDR Cliente" },
  { href: "/settings/sla", label: "SLA" },
];

export function SettingsNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isFullSettingsUser = canAccessRoute(
    user?.role,
    "/settings/appearance",
    user?.permissions,
  );

  const visibleLinks = links.filter((link) => {
    if (link.href === "/settings/navigation") {
      return !isFullSettingsUser;
    }
    return canAccessRoute(user?.role, link.href, user?.permissions);
  });

  if (visibleLinks.length === 0) {
    return null;
  }

  return (
    <nav className="flex flex-wrap gap-2 border-b border-[var(--atria-primary)]/10 pb-4">
      {visibleLinks.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-[var(--atria-primary)] text-white"
                : "bg-[var(--atria-primary)]/5 text-[var(--atria-primary)] hover:bg-[var(--atria-primary)]/10"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
