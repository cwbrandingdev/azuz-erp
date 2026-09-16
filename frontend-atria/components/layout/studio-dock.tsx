"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NavItem } from "@/components/layout/navigation";
import {
  getNavItemBadgeCount,
  useVisibleNavSections,
} from "@/hooks/use-visible-nav-sections";
import { isNavItemActive } from "@/lib/nav-match";
import { cn } from "@/lib/utils";

const ICON_SIZE = 50;
const ICON_GAP = 5;
const SEPARATOR_INSET = 8;
const PADDING_X = 12;
const MAGNIFY_RADIUS = 120;
const MAX_SCALE = 1.85;
const TRAY_HEIGHT = ICON_SIZE + 13;

type DockEntry =
  | { kind: "item"; key: string; item: NavItem }
  | { kind: "separator"; key: string };

function getScale(distance: number) {
  if (distance >= MAGNIFY_RADIUS) return 1;
  const t = 1 - distance / MAGNIFY_RADIUS;
  return 1 + (MAX_SCALE - 1) * (t * t);
}

function getUnscaledWidth(entries: DockEntry[]) {
  let width = PADDING_X * 2;
  entries.forEach((entry, index) => {
    const next = entries[index + 1];
    if (entry.kind === "separator") {
      width += SEPARATOR_INSET * 2 + 1;
      return;
    }
    width += ICON_SIZE;
    if (next?.kind === "item") width += ICON_GAP;
  });
  return width;
}

function restCenters(entries: DockEntry[], virtualLeft: number) {
  let x = virtualLeft + PADDING_X;
  return entries.map((entry, index) => {
    const next = entries[index + 1];
    if (entry.kind === "separator") {
      x += SEPARATOR_INSET * 2 + 1;
      return 0;
    }
    const center = x + ICON_SIZE / 2;
    x += ICON_SIZE + (next?.kind === "item" ? ICON_GAP : 0);
    return center;
  });
}

function DockName({ name, lift }: { name: string; lift: number }) {
  return (
    <span
      className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-[6px] bg-[#1d1d1f] px-2.5 py-0.5 text-[12px] font-medium tracking-tight text-white shadow-[0_6px_18px_rgba(0,0,0,0.28)]"
      style={{ bottom: lift + 10 }}
    >
      {name}
      <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#1d1d1f]" />
    </span>
  );
}

function DockGlyph({
  item,
  size,
  bouncing,
  badge,
  active,
}: {
  item: NavItem;
  size: number;
  bouncing: boolean;
  badge: number;
  active: boolean;
}) {
  const Icon = item.icon;
  const iconSize = Math.max(16, Math.round(size * 0.44));

  return (
    <span
      className={cn("relative block", bouncing && "studio-dock-bounce")}
      style={{ width: size, height: size }}
    >
      <span
        className={cn(
          "relative flex size-full items-center justify-center overflow-hidden rounded-[13px] shadow-[0_4px_10px_rgba(0,0,0,0.28)]",
          active
            ? "ring-2 ring-[var(--atria-accent)]"
            : "ring-1 ring-white/25",
        )}
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--atria-sidebar) 82%, white) 0%, var(--atria-sidebar) 58%, color-mix(in srgb, var(--atria-sidebar) 78%, black) 100%)",
        }}
      >
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-white/20" />
        <Icon
          size={iconSize}
          strokeWidth={1.8}
          className="relative text-[var(--sidebar-foreground)] drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
        />
      </span>
      {badge > 0 ? (
        <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--atria-accent)] px-1 text-[10px] font-bold text-[var(--atria-primary)] shadow-sm ring-2 ring-white/80 dark:ring-[#1c1c1e]/80">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </span>
  );
}

export function StudioDock() {
  const pathname = usePathname();
  const router = useRouter();
  const { sections, appUpdatesBadgeCount } = useVisibleNavSections();
  const dockRef = useRef<HTMLDivElement>(null);
  const [scales, setScales] = useState<number[]>([]);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [bouncingKey, setBouncingKey] = useState<string | null>(null);
  const frameRef = useRef(0);

  const entries = useMemo<DockEntry[]>(() => {
    const next: DockEntry[] = [];
    sections.forEach((section, index) => {
      if (index > 0) {
        next.push({ kind: "separator", key: `sep-${section.label}` });
      }
      section.items.forEach((item) => {
        next.push({ kind: "item", key: item.href, item });
      });
    });
    return next;
  }, [sections]);

  const unscaledWidth = useMemo(() => getUnscaledWidth(entries), [entries]);

  const applyMagnify = useCallback(
    (clientX: number | null) => {
      if (clientX === null || !dockRef.current) {
        setScales(entries.map(() => 1));
        return;
      }
      const rect = dockRef.current.getBoundingClientRect();
      const virtualLeft = rect.left + rect.width / 2 - unscaledWidth / 2;
      const centers = restCenters(entries, virtualLeft);
      setScales(
        entries.map((entry, index) => {
          if (entry.kind === "separator") return 1;
          return getScale(Math.abs(clientX - centers[index]));
        }),
      );
    },
    [entries, unscaledWidth],
  );

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const x = event.clientX;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => applyMagnify(x));
  };

  const handlePointerLeave = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    setHoveredKey(null);
    applyMagnify(null);
  };

  const bounce = (key: string) => {
    setBouncingKey(key);
    window.setTimeout(() => {
      setBouncingKey((current) => (current === key ? null : current));
    }, 560);
  };

  return (
    <nav
      aria-label="Navegação principal"
      className="pointer-events-none fixed inset-x-0 bottom-3 z-40 hidden justify-center lg:flex"
    >
      <div className="pointer-events-auto select-none pt-16">
        <div
          ref={dockRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="studio-dock flex items-end overflow-visible"
          style={{
            height: TRAY_HEIGHT,
            paddingLeft: PADDING_X,
            paddingRight: PADDING_X,
            paddingBottom: 7,
            paddingTop: 6,
          }}
        >
          {entries.map((entry, index) => {
            if (entry.kind === "separator") {
              return (
                <span
                  key={entry.key}
                  className="shrink-0 self-end bg-black/20 dark:bg-white/25"
                  style={{
                    width: 1,
                    height: ICON_SIZE - 16,
                    marginLeft: SEPARATOR_INSET,
                    marginRight: SEPARATOR_INSET,
                    marginBottom: 8,
                  }}
                />
              );
            }

            const { item } = entry;
            const next = entries[index + 1];
            const scale = scales[index] ?? 1;
            const size = ICON_SIZE * scale;
            const active = isNavItemActive(pathname, item);
            const badge = getNavItemBadgeCount(item.href, appUpdatesBadgeCount);
            const showName = hoveredKey === entry.key;
            const bouncing = bouncingKey === entry.key;

            const glyph = (
              <DockGlyph
                item={item}
                size={size}
                bouncing={bouncing}
                badge={badge}
                active={active}
              />
            );

            const slotStyle = {
              width: size,
              height: ICON_SIZE,
              marginRight: next?.kind === "item" ? ICON_GAP : 0,
            };

            if (item.children?.length) {
              return (
                <div
                  key={entry.key}
                  className="relative flex shrink-0 items-end justify-center"
                  style={slotStyle}
                  onPointerEnter={() => setHoveredKey(entry.key)}
                >
                  {showName ? <DockName name={item.name} lift={size} /> : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          type="button"
                          aria-label={item.name}
                          className="block rounded-[13px] outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                          onClick={() => bounce(entry.key)}
                        />
                      }
                    >
                      {glyph}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="center" className="mb-1 min-w-44">
                      {item.children.map((child) => (
                        <DropdownMenuItem
                          key={child.href}
                          onClick={() => router.push(child.href)}
                        >
                          {child.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {active ? <span className="studio-dock-dot" /> : null}
                </div>
              );
            }

            return (
              <div
                key={entry.key}
                className="relative flex shrink-0 items-end justify-center"
                style={slotStyle}
                onPointerEnter={() => setHoveredKey(entry.key)}
              >
                {showName ? <DockName name={item.name} lift={size} /> : null}
                <Link
                  href={item.href}
                  aria-label={item.name}
                  className="block rounded-[13px] outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                  onClick={() => bounce(entry.key)}
                >
                  {glyph}
                </Link>
                {active ? <span className="studio-dock-dot" /> : null}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
