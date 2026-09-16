import { isRouteActive } from "@/lib/nav-active";
import type { NavItem, NavSection } from "@/components/layout/navigation";

export function isNavItemActive(pathname: string, item: NavItem) {
  return (
    isRouteActive(pathname, item.href) ||
    Boolean(item.children?.some((child) => isRouteActive(pathname, child.href)))
  );
}

export function isNavSectionActive(pathname: string, section: NavSection) {
  return section.items.some((item) => isNavItemActive(pathname, item));
}

export function getActiveNavSection(pathname: string, sections: NavSection[]) {
  return sections.find((section) => isNavSectionActive(pathname, section)) ?? null;
}

export function getSectionTabItems(section: NavSection | null) {
  if (!section) return [];

  return section.items.flatMap((item) => {
    if (item.children?.length) {
      return item.children.map((child) => ({
        name: child.name,
        href: child.href,
      }));
    }
    return [{ name: item.name, href: item.href }];
  });
}
