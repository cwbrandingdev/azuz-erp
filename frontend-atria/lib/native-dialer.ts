import { toE164 } from "@/lib/lead-phone";

export type NativeDialerPlatform =
  | "windows"
  | "linux"
  | "android"
  | "macos"
  | "other";

const SETUP_STORAGE_KEY = "atria.dialer.native-setup.v1";

export function detectNativeDialerPlatform(): NativeDialerPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/Windows NT/i.test(ua)) return "windows";
  if (/Mac OS X/i.test(ua)) return "macos";
  if (/Linux/i.test(ua)) return "linux";
  return "other";
}

export function hasSeenNativeDialerSetup(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SETUP_STORAGE_KEY) === "1";
}

export function markNativeDialerSetupSeen(): void {
  window.localStorage.setItem(SETUP_STORAGE_KEY, "1");
}

export function toNativeCallHref(
  phone: string | null | undefined,
): string | null {
  const e164 = toE164(phone);
  if (!e164) return null;
  // Phone Link only receives the number via tel:. ms-phone: opens the app empty.
  return `tel:${e164}`;
}
