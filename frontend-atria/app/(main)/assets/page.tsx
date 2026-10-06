"use client";

import { AssetGrid } from "@/components/assets/asset-grid";
import { AssetUploadDialog } from "@/components/assets/asset-upload-dialog";
import { useClients } from "@/hooks/use-clients";
import { useGroupedAssets } from "@/hooks/use-grouped-assets";
import { useInvalidateAssets } from "@/hooks/use-query-invalidation";

export default function AssetsPage() {
  const groupsQuery = useGroupedAssets();
  const clientsQuery = useClients();
  const invalidateAssets = useInvalidateAssets();
  const groups = groupsQuery.data;

  if (groupsQuery.isPending && !groups) {
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
        <AssetUploadDialog
          clients={clientsQuery.data ?? []}
          onSuccess={() => void invalidateAssets()}
        />
      </div>

      <AssetGrid
        groups={groups ?? []}
        onRefresh={() => void invalidateAssets()}
      />
    </div>
  );
}
