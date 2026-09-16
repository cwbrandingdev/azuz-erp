export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  displayName: string;
}

export interface SearchLocationInput {
  city: string;
  uf: string;
  address?: string;
}

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_USER_AGENT = "atria-erp/1.0 (contact@atria.local)";
const GEOCODE_TIMEOUT_MS = 15_000;

interface NominatimResult {
  lat?: string;
  lon?: string;
  display_name?: string;
}

export function buildSearchLocationQuery(location: SearchLocationInput): string {
  return [location.address, location.city, location.uf, "Brasil"]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

export async function geocodeSearchLocation(
  location: SearchLocationInput,
): Promise<GeocodedLocation | null> {
  const query = buildSearchLocationQuery(location);
  if (!query) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      limit: "1",
      addressdetails: "1",
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": NOMINATIM_USER_AGENT,
      },
    });

    if (!response.ok) {
      return null;
    }

    const results = (await response.json()) as NominatimResult[];
    const first = results[0];
    if (!first) {
      return null;
    }

    const latitude = Number(first.lat);
    const longitude = Number(first.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return {
      latitude,
      longitude,
      displayName: first.display_name?.trim() || query,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
