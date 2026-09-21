import { toTelHref } from "@/lib/lead-phone";

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

export function openNativeDialer(phone: string | null | undefined): boolean {
  const href = toTelHref(phone);
  if (!href || typeof document === "undefined") return false;

  const anchor = document.createElement("a");
  anchor.href = href;
  // Off-screen instead of display:none — Chrome on Windows ignores hidden tel: clicks.
  Object.assign(anchor.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "1px",
    height: "1px",
    opacity: "0",
    pointerEvents: "none",
  });
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  return true;
}
