import {
  LayoutDashboard,
  Kanban,
  Calendar,
  CalendarClock,
  ClipboardCheck,
  Layers,
  Users,
  FileSignature,
  FileText,
  Settings,
  Wallet,
  BarChart2,
  Activity,
  type LucideIcon,
  KanbanSquareIcon,
  MessageSquarePlus,
  Megaphone,
  UserCheckIcon,
} from "lucide-react";
import { WhatsAppNavIcon } from "@/components/layout/whatsapp-nav-icon";

export interface NavChild {
  name: string;
  href: string;
}

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  children?: NavChild[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    label: "VISÃO GERAL",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Meta Insights", href: "/insights", icon: BarChart2 },
    ],
  },
  {
    label: "PRODUÇÃO",
    items: [
      { name: "Kanban", href: "/kanban", icon: Kanban },
      {
        name: "Aprovação Interna",
        href: "/internal-approvals",
        icon: ClipboardCheck,
      },
      { name: "Calendário", href: "/calendar", icon: Calendar },
    ],
  },
  {
    label: "GESTÃO",
    items: [
      { name: "Produtividade", href: "/produtividade", icon: Activity },
      { name: "Clientes", href: "/clients", icon: Users },
      {
        name: "Financeiro",
        href: "/financial",
        icon: Wallet,
      },
      { name: "Contratos", href: "/contracts", icon: FileSignature },
      { name: "Propostas", href: "/proposals", icon: FileText },
      { name: "Central de Leads", href: "/leads-central", icon: UserCheckIcon },
    ],
  },
  {
    label: "LEADS",
    items: [
      { name: "Prospecção de Leads", href: "/leads", icon: Layers },
      { name: "Leads Kanban", href: "/leads/kanban", icon: KanbanSquareIcon },
      {
        name: "Agenda do Jhonatan",
        href: "/jhonatan-calendar",
        icon: CalendarClock,
      },
      { name: "WhatsApp", href: "/whatsapp", icon: WhatsAppNavIcon },
    ],
  },

  {
    label: "SISTEMA",
    items: [
      {
        name: "Sugestões",
        href: "/suggestions",
        icon: MessageSquarePlus,
      },
      {
        name: "Atualizações",
        href: "/app-updates",
        icon: Megaphone,
      },
      {
        name: "Configurações",
        href: "/settings/navigation",
        icon: Settings,
        children: [
          { name: "Navegação", href: "/settings/navigation" },
          { name: "Identidade", href: "/settings/branding" },
          { name: "Aparência", href: "/settings/appearance" },
          { name: "Integrações APIs", href: "/settings/api-integrations" },
          { name: "SDR Cliente", href: "/settings/client-sdr" },
          { name: "Usuários", href: "/settings/users" },
        ],
      },
    ],
  },
];

/** @deprecated Use navSections — kept for breadcrumb/search utilities */
export const navigation: NavItem[] = navSections.flatMap(
  (section) => section.items,
);

export const settingsRoutes =
  navigation
    .find((item) => item.name === "Configurações")
    ?.children?.map((child) => child.href) ?? [];

export const leadsRoutes = navigation
  .find((item) => item.name === "Leads")
  ?.children?.map((child) => child.href) ?? ["/leads", "/leads/kanban"];
