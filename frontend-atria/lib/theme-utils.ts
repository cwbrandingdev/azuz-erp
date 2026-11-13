export interface AppearanceSettings {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  sidebarColor: string;
  updatedAt?: string;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  primaryColor: "#004949",
  accentColor: "#E8C39E",
  backgroundColor: "#FFFFFF",
  textColor: "#0F172A",
  sidebarColor: "#004949",
};

export const SIDEBAR_PRESETS = [
  { name: "Atria Emerald", value: "#004949" },
  { name: "Corporate Navy", value: "#1E3A8A" },
  { name: "Deep Purple", value: "#581C87" },
  { name: "Midnight Slate", value: "#0F172A" },
  { name: "Forest Green", value: "#14532D" },
] as const;

export const PRIMARY_PRESETS = [
  { name: "Atria Emerald", value: "#004949" },
  { name: "Corporate Navy", value: "#1E3A8A" },
  { name: "Deep Purple", value: "#581C87" },
  { name: "Midnight Slate", value: "#0F172A" },
] as const;

export const ACCENT_PRESETS = [
  { name: "Atria Sand", value: "#E8C39E" },
  { name: "Coral Gold", value: "#F59E0B" },
  { name: "Crimson Accent", value: "#EF4444" },
  { name: "Teal Accent", value: "#14B8A6" },
] as const;

export const BACKGROUND_PRESETS = [
  { name: "Pure White", value: "#FFFFFF" },
  { name: "Soft Light Gray", value: "#F8FAFC" },
  { name: "Dark Mode Slate", value: "#0F172A" },
] as const;

export const TEXT_PRESETS = [
  { name: "Dark Charcoal", value: "#0F172A" },
  { name: "Medium Gray", value: "#334155" },
  { name: "Soft White", value: "#F8FAFC" },
] as const;

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getContrastColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#0F172A" : "#F8FAFC";
}

export type ThemeMode = "light" | "dark";
export type ThemePalette = "slate" | "indigo" | "emerald" | "amber";

export const THEME_STORAGE_KEY = "atria-ui-theme";

export const THEME_PALETTES: Record<
  ThemePalette,
  { name: string; primary: string; accent: string; sidebar: string }
> = {
  emerald: {
    name: "Emerald",
    primary: "#004949",
    accent: "#E8C39E",
    sidebar: "#004949",
  },
  slate: {
    name: "Slate",
    primary: "#334155",
    accent: "#94A3B8",
    sidebar: "#0F172A",
  },
  indigo: {
    name: "Indigo",
    primary: "#3730A3",
    accent: "#A5B4FC",
    sidebar: "#312E81",
  },
  amber: {
    name: "Amber",
    primary: "#92400E",
    accent: "#F59E0B",
    sidebar: "#78350F",
  },
};

export const THEME_PALETTE_IDS = Object.keys(THEME_PALETTES) as ThemePalette[];

export const DEFAULT_UI_THEME: { mode: ThemeMode; palette: ThemePalette } = {
  mode: "light",
  palette: "emerald",
};

const PUBLIC_LIGHT_PATH_PREFIX = "/p/";

export function isPublicLightPath(pathname: string | null | undefined) {
  return Boolean(pathname?.startsWith(PUBLIC_LIGHT_PATH_PREFIX));
}

export function isThemePalette(value: unknown): value is ThemePalette {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(THEME_PALETTES, value)
  );
}

export function parseStoredUiTheme(raw: string | null): {
  mode: ThemeMode;
  palette: ThemePalette;
} {
  if (!raw) return DEFAULT_UI_THEME;
  try {
    const parsed = JSON.parse(raw) as { mode?: unknown; palette?: unknown };
    return {
      mode: parsed.mode === "dark" ? "dark" : "light",
      palette: isThemePalette(parsed.palette)
        ? parsed.palette
        : DEFAULT_UI_THEME.palette,
    };
  } catch {
    return DEFAULT_UI_THEME;
  }
}

export function readStoredUiTheme(): { mode: ThemeMode; palette: ThemePalette } {
  if (typeof window === "undefined") return DEFAULT_UI_THEME;
  if (isPublicLightPath(window.location.pathname)) return DEFAULT_UI_THEME;
  return parseStoredUiTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
}

export function persistUiTheme(theme: {
  mode: ThemeMode;
  palette: ThemePalette;
}) {
  window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
}

export function applyUiTheme(theme: {
  mode: ThemeMode;
  palette: ThemePalette;
}) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme.mode === "dark");
  root.setAttribute("data-theme", theme.palette);
  root.style.colorScheme = theme.mode;

  const inlineVars = [
    "--atria-primary",
    "--atria-accent",
    "--atria-sidebar",
    "--atria-base",
    "--atria-text",
    "--background",
    "--foreground",
    "--card",
    "--card-foreground",
    "--primary",
    "--primary-foreground",
    "--accent",
    "--accent-foreground",
    "--sidebar",
    "--sidebar-foreground",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
  ];
  for (const name of inlineVars) {
    root.style.removeProperty(name);
  }
}

export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var pub=location.pathname.indexOf("${PUBLIC_LIGHT_PATH_PREFIX}")===0;var raw=localStorage.getItem("${THEME_STORAGE_KEY}");var parsed=raw?JSON.parse(raw):{};var mode=!pub&&parsed.mode==="dark"?"dark":"light";var palette=parsed.palette;var allowed={slate:1,indigo:1,emerald:1,amber:1};if(pub||!allowed[palette])palette="${DEFAULT_UI_THEME.palette}";var root=document.documentElement;root.classList.toggle("dark",mode==="dark");root.setAttribute("data-theme",palette);root.style.colorScheme=mode;}catch(e){}})();`;

export function applyAppearanceToDocument(
  settings: AppearanceSettings,
  options?: { force?: boolean },
) {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  const usingNamedPalette =
    !options?.force && isThemePalette(root.getAttribute("data-theme"));

  if (!usingNamedPalette) {
    root.style.setProperty("--atria-primary", settings.primaryColor);
    root.style.setProperty("--atria-accent", settings.accentColor);
    root.style.setProperty("--primary", settings.primaryColor);
    root.style.setProperty(
      "--primary-foreground",
      getContrastColor(settings.primaryColor),
    );
    root.style.setProperty("--accent", settings.accentColor);
    root.style.setProperty(
      "--accent-foreground",
      getContrastColor(settings.accentColor),
    );
    root.style.setProperty("--sidebar", settings.sidebarColor);
    root.style.setProperty(
      "--sidebar-foreground",
      getContrastColor(settings.sidebarColor),
    );
    root.style.setProperty("--atria-sidebar", settings.sidebarColor);
    root.style.setProperty("--sidebar-primary", settings.accentColor);
    root.style.setProperty(
      "--sidebar-primary-foreground",
      getContrastColor(settings.accentColor),
    );
  }

  if (isDark) return;

  root.style.setProperty("--atria-base", settings.backgroundColor);
  root.style.setProperty("--atria-text", settings.textColor);
  root.style.setProperty("--background", settings.backgroundColor);
  root.style.setProperty("--foreground", settings.textColor);
  root.style.setProperty("--card", settings.backgroundColor);
  root.style.setProperty("--card-foreground", settings.textColor);
}

export function resetAppearanceToDefaults() {
  applyAppearanceToDocument(DEFAULT_APPEARANCE);
}
