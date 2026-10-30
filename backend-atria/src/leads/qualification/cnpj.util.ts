const LABELED_CNPJ =
  /cnpj[\s:.\-–]*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/gi;
const FORMATTED_CNPJ = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g;

export function isValidCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (!/^\d{14}$/.test(digits) || /^(\d)\1+$/.test(digits)) {
    return false;
  }

  const first = cnpjCheckDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (first !== Number(digits[12])) return false;
  const second = cnpjCheckDigit(
    digits.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  return second === Number(digits[13]);
}

export function extractValidCnpjs(html: string): string[] {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const ordered: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!isValidCnpj(digits) || seen.has(digits)) return;
    seen.add(digits);
    ordered.push(digits);
  };

  for (const match of text.matchAll(LABELED_CNPJ)) {
    if (match[1]) push(match[1]);
  }
  for (const match of text.matchAll(FORMATTED_CNPJ)) {
    push(match[0]);
  }

  return ordered;
}

function cnpjCheckDigit(base: string, factors: number[]): number {
  const sum = base
    .split('')
    .reduce((acc, digit, index) => acc + Number(digit) * factors[index], 0);
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}
