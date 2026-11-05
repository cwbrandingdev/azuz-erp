const HOME_DDD = "41";
const VIVO_PREFIX = "015";

const BRAZIL_DDD = new Set([
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "21",
  "22",
  "24",
  "27",
  "28",
  "31",
  "32",
  "33",
  "34",
  "35",
  "37",
  "38",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
  "49",
  "51",
  "53",
  "54",
  "55",
  "61",
  "62",
  "63",
  "64",
  "65",
  "66",
  "67",
  "68",
  "69",
  "71",
  "73",
  "74",
  "75",
  "77",
  "79",
  "81",
  "82",
  "83",
  "84",
  "85",
  "86",
  "87",
  "88",
  "89",
  "91",
  "92",
  "93",
  "94",
  "95",
  "96",
  "97",
  "98",
  "99",
]);

const SERVICE_PREFIXES = ["0800", "0300", "0500", "0900", "3003", "3004", "4003", "4004"];

export function digitsOnly(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}

function nationalDigits(phone: string | null | undefined): string {
  let digits = digitsOnly(phone);
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  return digits;
}

export function toVivoDialString(phone: string | null | undefined): string | null {
  const digits = nationalDigits(phone);
  if (!digits) return null;
  if (SERVICE_PREFIXES.some((prefix) => digits.startsWith(prefix))) {
    return digits;
  }
  if (digits.length === 8 || digits.length === 9) {
    return digits;
  }
  if (digits.length !== 10 && digits.length !== 11) {
    return digits;
  }
  const ddd = digits.slice(0, 2);
  if (!BRAZIL_DDD.has(ddd)) return digits;
  if (ddd === HOME_DDD) return digits.slice(2);
  return `${VIVO_PREFIX}${digits}`;
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
