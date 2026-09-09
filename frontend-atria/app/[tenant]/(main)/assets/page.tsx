"use client";

import { useCallback, useEffect, useState } from "react";
import { AssetGrid } from "@/components/assets/asset-grid";
import { AssetUploadDialog } from "@/components/assets/asset-upload-dialog";
import { clientsService, assetsService } from "@/services";
import type { Client, ClientAssetGroup } from "@/services/types";

export default function AssetsPage() {
  const [groups, setGroups] = useState<ClientAssetGroup[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [grouped, clientList] = await Promise.all([
        assetsService.getGroupedAssets(),
        clientsService.getClients(),
      ]);
      setGroups(grouped);
      setClients(clientList);
    } catch {
      setGroups([]);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading && groups.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
            Drive de Assets
          </h1>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Logos, brand guidelines e mídias organizados por cliente
          </p>
        </div>
        <AssetUploadDialog clients={clients} onSuccess={() => void loadData()} />
      </div>

      <AssetGrid groups={groups} onRefresh={() => void loadData()} />
    </div>
  );
}
