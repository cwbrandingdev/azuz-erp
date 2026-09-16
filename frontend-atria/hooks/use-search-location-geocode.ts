import { useQuery } from "@tanstack/react-query";
import {
  geocodeSearchLocation,
  type SearchLocationInput,
} from "@/lib/nominatim-geocoding";

export function useSearchLocationGeocode(location: SearchLocationInput | null) {
  const city = location?.city.trim() ?? "";
  const uf = location?.uf.trim() ?? "";
  const address = location?.address?.trim() ?? "";

  return useQuery({
    queryKey: ["search-location-geocode", city, uf, address],
    queryFn: () =>
      geocodeSearchLocation({
        city,
        uf,
        address: address || undefined,
      }),
    enabled: Boolean(city && uf),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}
