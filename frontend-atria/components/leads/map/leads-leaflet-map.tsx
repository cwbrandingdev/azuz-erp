"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { configureLeafletDefaults } from "@/components/leads/map/configure-leaflet-defaults";
import { LeadMapMarker } from "@/components/leads/map/lead-map-marker";
import { MapViewController } from "@/components/leads/map/map-view-controller";
import { getLeadsWithCoordinates } from "@/lib/lead-map-utils";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  LEADS_MAP_HEIGHT_PX,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  SEARCH_LOCATION_ZOOM,
} from "@/lib/map-constants";
import type { SearchLocationInput } from "@/lib/nominatim-geocoding";
import type { Lead } from "@/services/types";
import "leaflet/dist/leaflet.css";

export interface LeadsLeafletMapProps {
  leads: Lead[];
  searchLocation: SearchLocationInput;
  mapCenter?: {
    latitude: number;
    longitude: number;
  } | null;
  geocoding?: boolean;
  addingKanbanId?: string | null;
  onAddToLeads?: (lead: Lead) => void;
}

export function LeadsLeafletMap({
  leads,
  searchLocation,
  mapCenter,
  geocoding,
  addingKanbanId,
  onAddToLeads,
}: LeadsLeafletMapProps) {
  useEffect(() => {
    configureLeafletDefaults();
  }, []);

  const geocodedLeads = useMemo(() => getLeadsWithCoordinates(leads), [leads]);

  const center = mapCenter ?? {
    latitude: DEFAULT_MAP_CENTER.latitude,
    longitude: DEFAULT_MAP_CENTER.longitude,
  };

  const initialZoom = mapCenter ? SEARCH_LOCATION_ZOOM : DEFAULT_MAP_ZOOM;

  return (
    <div
      className="leads-map-root relative isolate overflow-hidden rounded-xl"
      style={{ height: LEADS_MAP_HEIGHT_PX }}
    >
      {geocoding && (
        <div className="absolute inset-x-0 top-0 z-[2] bg-white/80 px-4 py-2 text-center text-xs text-[var(--atria-primary)]/70 backdrop-blur-sm">
          Localizando endereço no mapa...
        </div>
      )}
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={initialZoom}
        scrollWheelZoom
        className="leads-map-container z-0"
        style={{ height: LEADS_MAP_HEIGHT_PX, width: "100%" }}
      >
        <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
        <MapViewController leads={geocodedLeads} center={center} />
        {geocodedLeads.map((lead) => (
          <LeadMapMarker
            key={lead.id}
            lead={lead}
            adding={addingKanbanId === lead.id}
            onAddToLeads={onAddToLeads}
          />
        ))}
      </MapContainer>
      {geocodedLeads.length === 0 && !geocoding && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-white/95 to-transparent px-4 pb-4 pt-8 text-center text-xs text-[var(--atria-primary)]/60">
          Nenhum lead com coordenadas nesta pesquisa. O mapa está centralizado em{" "}
          {[searchLocation.address, searchLocation.city, searchLocation.uf]
            .filter(Boolean)
            .join(", ")}
          .
        </div>
      )}
    </div>
  );
}
