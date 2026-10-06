"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  FileText,
  Kanban,
  LayoutDashboard,
  Search,
  Wallet,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,

} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { canAccessRoute } from "@/lib/navigation-access";
import { getAllNavLinks } from "@/lib/navigation-utils";
import { usePrefetchNav } from "@/hooks/use-prefetch-nav";
import {
  clientsService,
  financeService,
  kanbanService,
} from "@/services";
import type { Client, FinanceTransaction, KanbanTask } from "@/services/types";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  label: string;
  description?: string;
  href: string;
  group: string;
  icon: "nav" | "client" | "task" | "transaction";
}

const GROUP_ORDER = [
  "Navegação",
  "Clientes",
  "Tarefas",
  "Financeiro",
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { user } = useAuth();
  const prefetchNav = usePrefetchNav();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navLinks = useMemo(
    () =>
      getAllNavLinks().filter((link) =>
        canAccessRoute(user?.role, link.href, user?.permissions),
      ),
    [user?.permissions, user?.role],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientList, taskList, txResult] = await Promise.all([
        clientsService.getClients().catch(() => []),
        kanbanService.getTasks().catch(() => []),
        financeService
          .getTransactions({ page: 1, limit: 50 })
          .catch(() => ({ data: [] })),
      ]);
      setClients(clientList);
      setTasks(taskList);
      setTransactions(txResult.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      void loadData();
    }
  }, [open, loadData]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: SearchResult[] = [];

    navLinks.forEach((link) => {
      if (!q || link.name.toLowerCase().includes(q)) {
        items.push({
          id: `nav-${link.href}`,
          label: link.name,
          description: link.group,
          href: link.href,
          group: "Navegação",
          icon: "nav",
        });
      }
    });

    clients.forEach((client) => {
      const haystack = `${client.companyName} ${client.contactName ?? ""} ${client.email ?? ""}`.toLowerCase();
      if (!q || haystack.includes(q)) {
        items.push({
          id: `client-${client.id}`,
          label: client.companyName,
          description: client.contactName ?? "Cliente",
          href: `/clients`,
          group: "Clientes",
          icon: "client",
        });
      }
    });

    tasks.forEach((task) => {
      if (!q || task.title.toLowerCase().includes(q)) {
        items.push({
          id: `task-${task.id}`,
          label: task.title,
          description: task.client?.companyName ?? "Tarefa",
          href: `/kanban`,
          group: "Tarefas",
          icon: "task",
        });
      }
    });

    transactions.forEach((tx) => {
      if (!q || tx.description.toLowerCase().includes(q)) {
        items.push({
          id: `tx-${tx.id}`,
          label: tx.description,
          description: tx.type === "income" ? "Receita" : "Despesa",
          href: `/financial`,
          group: "Financeiro",
          icon: "transaction",
        });
      }
    });

    return items
      .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group))
      .slice(0, 12);
  }, [query, navLinks, clients, tasks, transactions]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function navigate(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      navigate(results[selectedIndex].href);
    }
  }

  function ResultIcon({ type }: { type: SearchResult["icon"] }) {
    const className = "size-4 shrink-0 text-[var(--atria-primary)]/50";
    switch (type) {
      case "client":
        return <Building2 className={className} />;
      case "task":
        return <Kanban className={className} />;
      case "transaction":
        return <Wallet className={className} />;
      default:
        return <LayoutDashboard className={className} />;
    }
  }

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: results.filter((r) => r.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border/60 px-4 py-3">
          <DialogTitle className="sr-only">Busca global</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--atria-primary)]/40" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar clientes, tarefas, transações..."
              className="h-11 border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0"
            />
            <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border/80 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
              ESC
            </kbd>
          </div>
        </DialogHeader>

        <div className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          {loading ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Carregando...
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado
            </p>
          ) : (
            grouped.map(({ group, items }) => (
              <div key={group} className="mb-2">
                <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
                {items.map((result) => {
                  const globalIndex = results.indexOf(result);
                  const selected = globalIndex === selectedIndex;

                  return (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => navigate(result.href)}
                      onMouseEnter={() => prefetchNav(result.href)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        selected
                          ? "bg-[var(--atria-primary)]/8 text-[var(--atria-primary)]"
                          : "hover:bg-muted/60"
                      }`}
                    >
                      <ResultIcon type={result.icon} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{result.label}</p>
                        {result.description && (
                          <p className="truncate text-xs text-muted-foreground">
                            {result.description}
                          </p>
                        )}
                      </div>
                      <FileText className="size-3.5 shrink-0 text-muted-foreground/50" />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-4 py-2 text-[10px] text-muted-foreground">
          <span>↑↓ navegar · Enter selecionar</span>
          <span className="hidden sm:inline">
            <kbd className="rounded border px-1">⌘</kbd>{" "}
            <kbd className="rounded border px-1">K</kbd>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return { open, setOpen };
}
