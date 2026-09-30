export const META_MIN_SCHEDULE_LEAD_MS = 10 * 60 * 1000;
export const META_MAX_SCHEDULE_LEAD_MS = 75 * 24 * 60 * 60 * 1000;

export function resolveMetaPublishAt(
  publicationDate: Date,
  now = new Date(),
): { publishAtUnix: number | null; error?: string } {
  const targetMs = publicationDate.getTime();
  if (Number.isNaN(targetMs)) {
    return { publishAtUnix: null, error: 'Data de publicação inválida' };
  }

  const leadMs = targetMs - now.getTime();
  if (leadMs <= 0) {
    return { publishAtUnix: null };
  }

  if (leadMs < META_MIN_SCHEDULE_LEAD_MS) {
    return {
      publishAtUnix: null,
      error:
        'A publicação no Instagram deve ser agendada com pelo menos 10 minutos de antecedência',
    };
  }

  if (leadMs > META_MAX_SCHEDULE_LEAD_MS) {
    return {
      publishAtUnix: null,
      error:
        'A publicação no Instagram não pode ser agendada com mais de 75 dias de antecedência',
    };
  }

  return { publishAtUnix: Math.floor(targetMs / 1000) };
}
