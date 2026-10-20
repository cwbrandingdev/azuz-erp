export function compareChartAccountCodes(
  left: string | null | undefined,
  right: string | null | undefined,
  leftFallback = '',
  rightFallback = '',
): number {
  const a = (left?.trim() || leftFallback).trim();
  const b = (right?.trim() || rightFallback).trim();
  const aParts = a.split('.');
  const bParts = b.split('.');
  const maxLen = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < maxLen; index += 1) {
    const aSeg = aParts[index] ?? '';
    const bSeg = bParts[index] ?? '';
    const aNum = /^\d+$/.test(aSeg) ? Number(aSeg) : Number.NaN;
    const bNum = /^\d+$/.test(bSeg) ? Number(bSeg) : Number.NaN;

    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      if (aNum !== bNum) return aNum - bNum;
      continue;
    }

    const cmp = aSeg.localeCompare(bSeg, 'pt-BR', { numeric: true });
    if (cmp !== 0) return cmp;
  }

  return 0;
}

export function compareChartAccounts<
  T extends { code: string | null; name: string },
>(left: T, right: T): number {
  const byCode = compareChartAccountCodes(left.code, right.code);
  if (byCode !== 0) return byCode;
  return left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' });
}
