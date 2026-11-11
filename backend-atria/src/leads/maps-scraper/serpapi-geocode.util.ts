const NOMINATIM_TIMEOUT_MS = 15_000;

export async function resolveSerpApiLlForSearch(
  locationQuery: string,
): Promise<string | null> {
  const query = locationQuery.trim();
  if (!query) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

  try {
    const params = new URLSearchParams({
      q: query.includes('Brasil') ? query : `${query}, Brasil`,
      format: 'json',
      limit: '1',
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'atria-erp/1.0',
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Array<{ lat?: string; lon?: string }>;
    const first = data[0];
    if (!first?.lat || !first?.lon) {
      return null;
    }

    const lat = Number(first.lat);
    const lon = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }

    return `@${lat},${lon},13z`;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
