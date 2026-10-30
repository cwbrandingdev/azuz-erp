import Cookies from "js-cookie";

type CookieAttributes = Cookies.CookieAttributes;

// js-cookie só funciona no navegador; no SSR não existe document.cookie.
const isBrowser = typeof document !== "undefined";

const DEFAULT_ATTRIBUTES: CookieAttributes = {
  path: "/",
  sameSite: "lax",
  secure: isBrowser && window.location.protocol === "https:",
};

export function getCookie(name: string): string | undefined {
  if (!isBrowser) return undefined;
  return Cookies.get(name);
}

export function setCookie(
  name: string,
  value: string,
  attributes?: CookieAttributes,
): void {
  if (!isBrowser) return;
  Cookies.set(name, value, { ...DEFAULT_ATTRIBUTES, ...attributes });
}

// A remoção precisa do mesmo path/domain usado na gravação, senão o cookie fica.
export function removeCookie(
  name: string,
  attributes?: CookieAttributes,
): void {
  if (!isBrowser) return;
  Cookies.remove(name, { ...DEFAULT_ATTRIBUTES, ...attributes });
}

export function getJsonCookie<T>(name: string): T | undefined {
  const raw = getCookie(name);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function setJsonCookie<T>(
  name: string,
  value: T,
  attributes?: CookieAttributes,
): void {
  setCookie(name, JSON.stringify(value), attributes);
}
