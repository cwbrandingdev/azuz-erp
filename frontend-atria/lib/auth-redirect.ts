// Aceita só caminhos internos: "//site.com" e "/\site.com" seriam tratados pelo
// navegador como outro domínio, o que permitiria redirecionar para fora do app.
export function getSafeNextPath(): string | null {
  if (typeof window === "undefined") return null;

  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/")) return null;
  if (next.startsWith("//") || next.startsWith("/\\")) return null;

  return next;
}
