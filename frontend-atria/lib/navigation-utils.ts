import { navSections, type NavItem } from "@/components/layout/navigation";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  creation: "Kanban",
  financial: "Financeiro",
  content: "Conteúdo",
  management: "Gestão de Conteúdo",
  insights: "Meta Insights",
  kanban: "Kanban",
  "internal-approvals": "Aprovação Interna",
  suggestions: "Sugestões",
  "app-updates": "Atualizações",
  calendar: "Calendário",
  clients: "Clientes",
  leads: "Prospecção de Leads",
  assets: "Assets",
  contracts: "Contratos",
  new: "Nova",
  edit: "Editar",
  proposals: "Propostas",
  reports: "Relatórios",
  resumos: "Resumos",
  settings: "Configurações",
  branding: "Identidade",
  integrations: "Integrações",
  "api-integrations": "Integrações / APIs",
  appearance: "Aparência",
  "client-sdr": "SDR Cliente",
  users: "Usuários",
};

const SECTION_BY_HREF = new Map<string, string>();
for (const section of navSections) {
  for (const item of section.items) {
    SECTION_BY_HREF.set(item.href, section.label);
    item.children?.forEach((child) => {
      SECTION_BY_HREF.set(child.href, section.label);
    });
  }
}

function findNavItem(pathname: string): NavItem | undefined {
  for (const section of navSections) {
    for (const item of section.items) {
      if (
        pathname === item.href ||
        pathname.startsWith(`${item.href}/`) ||
        (item.href === "/creation" && pathname.startsWith("/content/"))
      ) {
        return item;
      }
      const child = item.children?.find(
        (c) => pathname === c.href || pathname.startsWith(`${c.href}/`),
      );
      if (child) return item;
    }
  }
  return undefined;
}

function findNavChild(pathname: string) {
  for (const section of navSections) {
    for (const item of section.items) {
      const child = item.children?.find(
        (c) => pathname === c.href || pathname.startsWith(`${c.href}/`),
      );
      if (child) return { parent: item, child };
    }
  }
  return null;
}

export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [];
  const match = findNavChild(pathname);

  if (match) {
    const sectionLabel = formatSectionLabel(
      SECTION_BY_HREF.get(match.child.href) ?? "",
    );
    if (sectionLabel) crumbs.push({ label: sectionLabel });
    crumbs.push({ label: match.parent.name, href: match.parent.href });
    crumbs.push({ label: match.child.name });
    return crumbs;
  }

  const item = findNavItem(pathname);
  if (item) {
    const sectionLabel = formatSectionLabel(
      SECTION_BY_HREF.get(item.href) ?? "",
    );
    if (sectionLabel) crumbs.push({ label: sectionLabel });
    crumbs.push({ label: item.name });
    return crumbs;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Dashboard" }];

  segments.forEach((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    crumbs.push({
      label: ROUTE_LABELS[segment] ?? capitalize(segment),
      href: index < segments.length - 1 ? href : undefined,
    });
  });

  return crumbs;
}

function formatSectionLabel(label: string) {
  if (!label) return "";
  return label
    .split(" ")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getAllNavLinks() {
  const links: { name: string; href: string; group: string }[] = [];

  for (const section of navSections) {
    for (const item of section.items) {
      links.push({
        name: item.name,
        href: item.href,
        group: section.label,
      });
      item.children?.forEach((child) => {
        links.push({
          name: child.name,
          href: child.href,
          group: section.label,
        });
      });
    }
  }

  return links;
}
