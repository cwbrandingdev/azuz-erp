"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/settings/branding", label: "Identidade" },
  { href: "/settings/appearance", label: "Aparência" },
  { href: "/settings/api-integrations", label: "Integrações / APIs" },
  { href: "/settings/client-sdr", label: "SDR Cliente" },
  { href: "/settings/sla", label: "SLA" },
  { href: "/settings/users", label: "Usuários" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-[var(--atria-primary)]/10 pb-4">
      {links.map((link) => {
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
