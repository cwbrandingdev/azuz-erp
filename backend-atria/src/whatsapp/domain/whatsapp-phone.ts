/** Drop a WhatsApp device suffix such as `:17` in `5541…:17@s.whatsapp.net`. */
function stripWhatsAppDeviceSuffix(input: string): string {
  return input.trim().replace(/(\d):\d+(?=@|$)/, '$1');
}

export function normalizeWhatsAppPhone(input: string): string {
  let digits = stripWhatsAppDeviceSuffix(input).replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

// O WhatsApp registra muitos celulares sem o 9. Esta chave ignora o 9 para comparar.
export function whatsAppPhoneKey(input: string): string {
  const digits = normalizeWhatsAppPhone(input);
  const hasNinthDigit =
    digits.length === 13 && digits.startsWith('55') && digits[4] === '9';
  return hasNinthDigit ? digits.slice(0, 4) + digits.slice(5) : digits;
}

// Os formatos com e sem o 9, para buscar o que já está gravado.
export function whatsAppPhoneVariants(input: string): string[] {
  const normalized = normalizeWhatsAppPhone(input);
  const key = whatsAppPhoneKey(input);
  // Sem o 9, celular começa com 6 a 9. Fixo (2 a 5) não ganha o 9.
  const isMobile =
    normalized !== key ||
    (key.length === 12 && key.startsWith('55') && /[6-9]/.test(key[4]));
  if (!isMobile) return [normalized];

  const withNine = `${key.slice(0, 4)}9${key.slice(4)}`;
  return [...new Set([normalized, key, withNine])];
}

export function isSameWhatsAppPhone(left: string, right: string): boolean {
  return whatsAppPhoneKey(left) === whatsAppPhoneKey(right);
}

/** Variants to try with WAHA check-exists (BR extra-9 and digit typos). */
export function brazilWhatsAppPhoneCandidates(input: string): string[] {
  const raw = input.replace(/\D/g, '');
  const normalized = normalizeWhatsAppPhone(input);
  const out: string[] = [];
  const push = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 10 && !out.includes(digits)) out.push(digits);
  };
  push(normalized);
  whatsAppPhoneVariants(input).forEach(push);
  if (raw.length >= 10 && raw.length <= 11) push(raw);
  if (normalized.startsWith('55') && normalized.length === 13) {
    push(normalized.slice(0, 4) + normalized.slice(5));
  }
  if (normalized.startsWith('55') && normalized.length === 14) {
    push(normalized.slice(0, 12));
    push(normalized.slice(0, 4) + normalized.slice(5, 13));
  }
  return out;
}

/** Returns a user-facing validation message, or null when plausible. */
export function validateNormalizedWhatsAppPhone(input: string): string | null {
  const raw = input.replace(/\D/g, '');
  if (raw.length < 10) {
    return 'Informe DDD + número (mínimo 10 dígitos).';
  }
  const digits = normalizeWhatsAppPhone(input);
  if (digits.startsWith('55') && digits.length > 13) {
    return 'Número longo demais. Confira os dígitos.';
  }
  return null;
}
