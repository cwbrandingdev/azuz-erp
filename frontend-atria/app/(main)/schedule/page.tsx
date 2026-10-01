"use client";

import { useEffect, useState } from "react";
import { PublishingSchedule } from "@/components/creation/publishing-schedule";
import { creationService } from "@/services";

export default function PublishingSchedulePage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<
    Awaited<
      ReturnType<typeof creationService.getCommandCenter>
    >["publishingSchedule"]
  >([]);

  useEffect(() => {
    void creationService
      .getCommandCenter()
      .then((data) => setItems(data.publishingSchedule ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
          Cronograma
        </h1>
        <p className="text-sm text-[var(--atria-primary)]/50">
          Publicações planejadas a partir do pipeline de criação
        </p>
      </div>
      <PublishingSchedule items={items} />
    </div>
  );
}
