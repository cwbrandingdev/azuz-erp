export const REVENUE_LABELS: Record<string, string> = {
  "ate-10k": "Até R$ 10 mil",
  "10k-50k": "R$ 10 a 50 mil",
  "50k-100k": "R$ 50 a 100 mil",
  "100k-500k": "R$ 100 a 500 mil",
  "acima-500k": "Acima de R$ 500 mil",
};

export function labelFor(map: Record<string, string>, value?: string) {
    if (!value?.trim()) return "Não informado";
    return map[value] ?? value.replaceAll("-", " ");
}