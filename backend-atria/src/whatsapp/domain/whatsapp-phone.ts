export function normalizeWhatsAppPhone(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export function isSameWhatsAppPhone(left: string, right: string): boolean {
  return normalizeWhatsAppPhone(left) === normalizeWhatsAppPhone(right);
}
