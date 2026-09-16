"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { LEADS_MAP_HEIGHT_PX } from "@/lib/map-constants";
import { useSearchLocationGeocode } from "@/hooks/use-search-location-geocode";
import type { SearchLocationInput } from "@/lib/nominatim-geocoding";
import type { LeadsLeafletMapProps } from "@/components/leads/map/leads-leaflet-map";
import type { Lead } from "@/services/types";

const LeadsLeafletMap = dynamic(
  () =>
    import("@/components/leads/map/leads-leaflet-map").then(
      (module) => module.LeadsLeafletMap,
    ),
  {
    ssr: false,
    loading: () => <LeadsMapSkeleton />,
  },
);

interface LeadsMapViewProps {
  leads: Lead[];
  searchLocation?: SearchLocationInput | null;
  addingKanbanId?: string | null;
  onAddToLeads?: (lead: Lead) => void;
}

function LeadsMapSkeleton() {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.02]"
      style={{ height: LEADS_MAP_HEIGHT_PX }}
    >
      <Loader2 className="size-6 animate-spin text-[var(--atria-primary)]/40" />
    </div>
  );
}

export function LeadsMapView({
  leads,
  searchLocation,
  addingKanbanId,
  onAddToLeads,
}: LeadsMapViewProps) {
  const city = searchLocation?.city.trim() ?? "";
  const uf = searchLocation?.uf.trim() ?? "";

  const geocodeQuery = useSearchLocationGeocode(
    city && uf
      ? {
          city,
          uf,
          address: searchLocation?.address?.trim() || undefined,
        }
      : null,
  );

  if (!city || !uf) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-[var(--atria-primary)]/15 bg-[var(--atria-primary)]/[0.02] px-6 text-center text-sm text-[var(--atria-primary)]/50"
        style={{ height: LEADS_MAP_HEIGHT_PX }}
      >
        Informe cidade e estado para visualizar o mapa.
      </div>
    );
  }

  if (geocodeQuery.isLoading) {
    return <LeadsMapSkeleton />;
  }

  const mapProps: LeadsLeafletMapProps = {
    leads,
    searchLocation: {
      city,
      uf,
      address: searchLocation?.address?.trim() || undefined,
    },
    mapCenter: geocodeQuery.data
      ? {
          latitude: geocodeQuery.data.latitude,
          longitude: geocodeQuery.data.longitude,
        }
      : null,
    geocoding: geocodeQuery.isFetching,
    addingKanbanId,
    onAddToLeads,
  };

  return <LeadsLeafletMap {...mapProps} />;
}
