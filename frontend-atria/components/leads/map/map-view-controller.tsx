"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { LEADS_BOUNDS_PADDING, SEARCH_LOCATION_ZOOM } from "@/lib/map-constants";
import { getLeadCoordinate } from "@/lib/lead-map-utils";
import type { Lead } from "@/services/types";

interface MapViewControllerProps {
  leads: Lead[];
  center: {
    latitude: number;
    longitude: number;
  };
}

export function MapViewController({ leads, center }: MapViewControllerProps) {
  const map = useMap();

  const viewKey = useMemo(
    () =>
      [
        center.latitude,
        center.longitude,
        ...leads.map(
          (lead) =>
            `${lead.id}:${lead.latitude ?? ""}:${lead.longitude ?? ""}`,
        ),
      ].join("|"),
    [center.latitude, center.longitude, leads],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize();

      const coordinates = leads
        .map((lead) => getLeadCoordinate(lead))
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (coordinates.length === 0) {
        map.setView([center.latitude, center.longitude], SEARCH_LOCATION_ZOOM);
        return;
      }

      const bounds = L.latLngBounds(
        coordinates.map((item) => [item.latitude, item.longitude]),
      );
      bounds.extend([center.latitude, center.longitude]);
      map.fitBounds(bounds, { padding: LEADS_BOUNDS_PADDING, maxZoom: 16 });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [viewKey, center.latitude, center.longitude, leads, map]);

  return null;
}
