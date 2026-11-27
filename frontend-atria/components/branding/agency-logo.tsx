"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useBranding } from "@/contexts/branding-context";

interface AgencyLogoProps {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  subtitle?: string;
  className?: string;
  nameClassName?: string;
  variant?: "default" | "sidebar" | "login";
}

const SIZE_MAP = {
  sm: { box: "size-9", text: "text-sm", img: 36 },
  md: { box: "size-10", text: "text-lg", img: 40 },
  lg: { box: "size-12", text: "text-xl", img: 48 },
} as const;

export function AgencyLogo({
  size = "md",
  showName = true,
  subtitle,
  className,
  nameClassName,
  variant = "default",
}: AgencyLogoProps) {
  const { branding, logoUrl } = useBranding();
  const dimensions = SIZE_MAP[size];
  const isSidebar = variant === "sidebar";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {logoUrl ? (
        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-xl bg-white/10",
            dimensions.box,
          )}
        >
          <Image
            src={logoUrl}
            alt={branding.agencyName}
            width={dimensions.img}
            height={dimensions.img}
            className="size-full object-contain p-1"
            unoptimized
          />
        </div>
      ) : (
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--atria-accent)] to-[#d4a574] shadow-lg ring-1 ring-white/20",
            dimensions.box,
            variant === "login" && "shadow-[var(--atria-primary)]/15 ring-[var(--atria-accent)]/30",
          )}
        >
          <span
            className={cn(
              "font-black tracking-tighter text-[var(--atria-primary)]",
              dimensions.text,
              variant === "login" && "dark:text-[#003535]",
            )}
          >
            {branding.agencyName.charAt(0).toUpperCase()}
          </span>
          {variant === "login" && (
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[var(--atria-primary)] bg-emerald-400 dark:border-[#001a1a]" />
          )}
        </div>
      )}

      {showName && (
        <div className="min-w-0">
          <p
            className={cn(
              "truncate font-bold tracking-tight",
              isSidebar ? "text-lg text-white" : "text-[var(--atria-primary)]",
              nameClassName,
            )}
          >
            {branding.agencyName}
          </p>
          {subtitle && (
            <p
              className={cn(
                "truncate text-[11px] font-medium",
                isSidebar ? "text-white/45" : "text-[var(--atria-primary)]/45",
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
