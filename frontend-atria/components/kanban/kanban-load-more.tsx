"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface KanbanLoadMoreProps {
  loading: boolean;
  onLoadMore: () => void;
}

// Fica no fim da coluna: quando aparece na tela, pede a próxima página.
export function KanbanLoadMore({ loading, onLoadMore }: KanbanLoadMoreProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  // Recria o observador ao terminar cada carga: se o sensor continuar visível,
  // ele dispara de novo e busca a página seguinte.
  useEffect(() => {
    const element = sentinelRef.current;
    if (!element || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMoreRef.current();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [loading]);

  return (
    <div
      ref={sentinelRef}
      className="flex h-8 items-center justify-center text-[var(--atria-primary)]/45"
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
    </div>
  );
}
