import { toE164 } from '../voice/phone.util';

export function digitsOnly(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '');
}

export function toWhatsappId(phone: string | null | undefined): string | null {
  const e164 = toE164(phone);
  return e164 ? e164.replace(/^\+/, '') : null;
}

export function previewText(value: string | null | undefined, max = 120): string | null {
  const trimmed = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

export function lastPhoneDigits(waId: string, length = 8): string {
  const digits = digitsOnly(waId);
  return digits.slice(-length);
}
