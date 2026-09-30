export const MASKED_SECRET_PLACEHOLDER = "********";

export function isMaskedSecretPreview(value: string | null | undefined): boolean {
  if (value == null) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed === MASKED_SECRET_PLACEHOLDER) return true;
  return /^.{1,8}\.\.\..{1,8}$/.test(trimmed);
}

export function resolveSecretUpdateValue(
  value: string | null | undefined,
  hasStoredSecret: boolean,
): string | null | undefined {
  if (value == null) {
    return hasStoredSecret ? undefined : null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return hasStoredSecret ? undefined : null;
  }

  if (
    trimmed === MASKED_SECRET_PLACEHOLDER ||
    /^.{1,8}\.\.\..{1,8}$/.test(trimmed)
  ) {
    return undefined;
  }

  return trimmed;
}
