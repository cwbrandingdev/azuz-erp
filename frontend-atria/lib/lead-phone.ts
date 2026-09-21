export function digitsOnly(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}

export function toE164(phone: string | null | undefined): string | null {
  let digits = digitsOnly(phone);
  if (!digits) return null;
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("55") && digits.length >= 12 && digits.length <= 13) {
    return `+${digits}`;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

export function toWhatsAppUrl(phone: string): string {
  const digits = digitsOnly(phone);
  const withCountry =
    digits.length >= 10 && !digits.startsWith("55") ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}

export function isDialablePhone(phone: string | null | undefined): boolean {
  return toE164(phone) != null;
}

export function toTelHref(phone: string | null | undefined): string | null {
  const e164 = toE164(phone);
  return e164 ? `tel:${e164}` : null;
}
