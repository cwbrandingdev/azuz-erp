"use client";

import { useEffect, useState } from "react";
import { leadsService } from "@/services";
import type { CrmUserOption } from "@/services/types";

export function useCrmUsers(enabled: boolean) {
  const [users, setUsers] = useState<CrmUserOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setUsers([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    leadsService
      .listCrmUsers()
      .then((list) => {
        if (!cancelled) setUsers(list);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { users, loading };
}
