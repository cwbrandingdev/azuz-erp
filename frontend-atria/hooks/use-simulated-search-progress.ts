"use client";

import { useEffect, useState } from "react";

/**
 * Fake progress for long single-request searches (no server %).
 * Climbs quickly at first, then asymptotes toward ~92% until `active` ends.
 */
export function useSimulatedSearchProgress(active: boolean) {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!active) {
      setPercent(0);
      return;
    }

    setPercent(4);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      // ~8s to mid-80s, then crawls toward 92%
      const next = Math.min(
        92,
        Math.round(92 * (1 - Math.exp(-elapsedMs / 8500))),
      );
      setPercent((current) => Math.max(current, Math.max(4, next)));
    }, 180);

    return () => window.clearInterval(timer);
  }, [active]);

  return percent;
}
