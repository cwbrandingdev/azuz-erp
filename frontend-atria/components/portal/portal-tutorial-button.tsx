"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePortalTutorial } from "@/components/portal/portal-tutorial-provider";
import { cn } from "@/lib/utils";

export function PortalTutorialButton({
  className,
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "sidebar";
}) {
  const { routeTabId, startTour } = usePortalTutorial();

  if (!routeTabId) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        "shrink-0 rounded-lg",
        variant === "sidebar"
          ? "w-full border-white/30 bg-white/10 text-white hover:bg-white/20"
          : "border-violet-200 text-violet-700 hover:bg-violet-50",
        className,
      )}
      onClick={() => startTour(routeTabId, { force: true })}
    >
      <HelpCircle className="size-4" />
      Tutorial
    </Button>
  );
}
