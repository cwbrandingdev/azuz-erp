"use client";

import { memo } from "react";
import { Marker, Popup } from "react-leaflet";
import { LeadMapMarkerPopup } from "@/components/leads/map/lead-map-marker-popup";
import { getLeadCoordinate } from "@/lib/lead-map-utils";
import type { Lead } from "@/services/types";

interface LeadMapMarkerProps {
  lead: Lead;
  adding?: boolean;
  onAddToLeads?: (lead: Lead) => void;
}

export const LeadMapMarker = memo(function LeadMapMarker({
  lead,
  adding,
  onAddToLeads,
}: LeadMapMarkerProps) {
  const coordinate = getLeadCoordinate(lead);
  if (!coordinate) {
    return null;
  }

  return (
    <Marker position={[coordinate.latitude, coordinate.longitude]}>
      <Popup minWidth={240} maxWidth={300}>
        <LeadMapMarkerPopup
          lead={lead}
          adding={adding}
          onAddToLeads={onAddToLeads}
        />
      </Popup>
    </Marker>
  );
});
