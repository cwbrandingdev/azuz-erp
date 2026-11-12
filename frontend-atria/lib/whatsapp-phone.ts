export function normalizeWhatsAppPhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export function validateNormalizedWhatsAppPhone(input: string): string | null {
  const raw = input.replace(/\D/g, "");
  if (raw.length < 10) {
    return "Informe DDD + número (mínimo 10 dígitos).";
  }
  const digits = normalizeWhatsAppPhone(input);
  if (digits.startsWith("55") && digits.length > 13) {
    return "Número longo demais. Confira os dígitos.";
  }
  return null;
}
