/** Coerces duplicated query params (string | string[]) into a single trimmed string. */
export function firstQueryValue(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.trim()) {
        return item.trim();
      }
    }
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  return undefined;
}
