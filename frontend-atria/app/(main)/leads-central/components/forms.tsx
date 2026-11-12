"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  AtSign,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toWhatsAppUrl } from "@/lib/lead-phone";
import { cn } from "@/lib/utils";
import { useSiteLeads } from "@/hooks/use-site-leads";
import { REVENUE_LABELS, labelFor } from "@/lib/site-leads";
import { getApiErrorMessage } from "@/lib/toast";
import type { SiteLead } from "@/services/types";

const REVENUE_ORDER = [
  "ate-10k",
  "10k-50k",
  "50k-100k",
  "100k-500k",
  "acima-500k",
];

const TRAFFIC_LABELS: Record<string, string> = {
  "sim-atualmente": "Investe agora",
  "sim-parou": "Já investiu",
  nao: "Não investe",
  nunca: "Nunca investiu",
};

const TRAFFIC_ORDER = ["sim-atualmente", "sim-parou", "nao", "nunca"];

const HIGH_REVENUE = new Set(["100k-500k", "acima-500k"]);

function formatWhen(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPhone(phone?: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone?.trim() || "—";
}

function instagramHref(value?: string) {
  const raw = value?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{2,30}$/.test(handle)) return null;
  return `https://www.instagram.com/${handle}`;
}

function instagramLabel(value?: string) {
  const raw = value?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{2,30}$/.test(handle)) return raw;
  return `@${handle}`;
}

function trafficVariant(value?: string) {
  if (value === "sim-atualmente") return "success" as const;
  if (value === "sim-parou") return "warning" as const;
  return "outline" as const;
}

function revenueVariant(value?: string) {
  if (value && HIGH_REVENUE.has(value)) return "default" as const;
  if (value === "50k-100k") return "secondary" as const;
  return "outline" as const;
}

function sortByKnownOrder(values: string[], order: string[]) {
  return [...values].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function matchesQuery(lead: SiteLead, query: string) {
  const haystack = [
    lead.name,
    lead.email,
    lead.phone,
    lead.instagram,
    lead.objective,
    labelFor(REVENUE_LABELS, lead.revenue),
    labelFor(TRAFFIC_LABELS, lead.traffic),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("pt-BR");
  return haystack.includes(query);
}

export default function Forms() {
  const [query, setQuery] = useState("");
  const [traffic, setTraffic] = useState("all");
  const [revenue, setRevenue] = useState("all");
  const [selected, setSelected] = useState<SiteLead | null>(null);

  const {
    data,
    error: queryError,
    isLoading: loading,
    isFetching: refreshing,
    refetch,
  } = useSiteLeads();
  const leads = useMemo(() => data?.leads ?? [], [data]);
  const error = queryError
    ? getApiErrorMessage(queryError, "Erro ao buscar os formulários")
    : null;
  const load = useCallback(() => refetch(), [refetch]);

  const trafficOptions = useMemo(
    () =>
      sortByKnownOrder(
        [...new Set(leads.map((lead) => lead.traffic).filter(Boolean))] as string[],
        TRAFFIC_ORDER,
      ),
    [leads],
  );
  const revenueOptions = useMemo(
    () =>
      sortByKnownOrder(
        [...new Set(leads.map((lead) => lead.revenue).filter(Boolean))] as string[],
        REVENUE_ORDER,
      ),
    [leads],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return [...leads]
      .filter((lead) => (traffic === "all" ? true : lead.traffic === traffic))
      .filter((lead) => (revenue === "all" ? true : lead.revenue === revenue))
      .filter((lead) => (normalized ? matchesQuery(lead, normalized) : true))
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime(),
      );
  }, [leads, query, revenue, traffic]);

  const investingNow = leads.filter(
    (lead) => lead.traffic === "sim-atualmente",
  ).length;
  const highTicket = leads.filter(
    (lead) => lead.revenue && HIGH_REVENUE.has(lead.revenue),
  ).length;

  if (loading) {
    return <LeadsSkeleton />;
  }

  if (error && leads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/20 p-12 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Button className="mt-4" variant="outline" onClick={() => void load()}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Formulários" value={leads.length} />
        <Stat label="Investindo agora" value={investingNow} />
        <Stat label="Acima de R$ 100 mil" value={highTicket} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[var(--atria-primary)]/40" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome, contato ou mensagem"
              aria-label="Buscar leads"
              className="pl-8"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => void load()}
            disabled={refreshing}
          >
            <RefreshCw className={cn(refreshing && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        <FilterRow
          label="Tráfego"
          value={traffic}
          onChange={setTraffic}
          options={trafficOptions.map((option) => ({
            value: option,
            label: labelFor(TRAFFIC_LABELS, option),
          }))}
        />
        <FilterRow
          label="Faturamento"
          value={revenue}
          onChange={setRevenue}
          options={revenueOptions.map((option) => ({
            value: option,
            label: labelFor(REVENUE_LABELS, option),
          }))}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/20 p-12 text-center">
          <p className="text-sm text-[var(--atria-primary)]/50">
            {leads.length === 0
              ? "Nenhum formulário chegou pelo site ainda."
              : "Nenhum lead corresponde a essa busca."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-[var(--atria-primary)]/50">
            {filtered.length === leads.length
              ? `${leads.length} formulário${leads.length === 1 ? "" : "s"}`
              : `${filtered.length} de ${leads.length} formulários`}
          </p>

          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => setSelected(lead)}
                className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-4 text-left"
              >
                <LeadSummary lead={lead} />
              </button>
            ))}
          </div>

          <Card className="hidden rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-4 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[var(--atria-primary)]/50">
                    Quando
                  </TableHead>
                  <TableHead className="text-[var(--atria-primary)]/50">
                    Lead
                  </TableHead>
                  <TableHead className="text-[var(--atria-primary)]/50">
                    Contato
                  </TableHead>
                  <TableHead className="text-[var(--atria-primary)]/50">
                    Faturamento
                  </TableHead>
                  <TableHead className="text-[var(--atria-primary)]/50">
                    Tráfego
                  </TableHead>
                  <TableHead className="text-[var(--atria-primary)]/50">
                    Mensagem
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(lead)}
                  >
                    <TableCell className="whitespace-nowrap text-[var(--atria-primary)]/70">
                      {formatWhen(lead.createdAt)}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-[var(--atria-primary)]">
                        {lead.name?.trim() || "Sem nome"}
                      </p>
                      <p className="text-xs text-[var(--atria-primary)]/50">
                        {instagramLabel(lead.instagram) ?? "Sem Instagram"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-[var(--atria-primary)]">
                        {formatPhone(lead.phone)}
                      </p>
                      <p className="max-w-48 truncate text-xs text-[var(--atria-primary)]/50">
                        {lead.email?.trim() || "Sem e-mail"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={revenueVariant(lead.revenue)}>
                        {labelFor(REVENUE_LABELS, lead.revenue)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={trafficVariant(lead.traffic)}>
                        {labelFor(TRAFFIC_LABELS, lead.traffic)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-normal">
                      <p className="line-clamp-2 text-[var(--atria-primary)]/70">
                        {lead.objective?.trim() || "Sem mensagem"}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <LeadDialog lead={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white px-4 py-3">
      <p className="text-xs font-medium text-[var(--atria-primary)]/50">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-[var(--atria-primary)]">
        {value}
      </p>
    </div>
  );
}

function FilterRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  if (options.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-[var(--atria-primary)]/50">
        {label}
      </span>
      <FilterChip active={value === "all"} onClick={() => onChange("all")}>
        Todos
      </FilterChip>
      {options.map((option) => (
        <FilterChip
          key={option.value}
          active={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </FilterChip>
      ))}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-transparent bg-[var(--atria-primary)] text-white"
          : "border-[var(--atria-primary)]/15 bg-white text-[var(--atria-primary)] hover:bg-[var(--atria-primary)]/5",
      )}
    >
      {children}
    </button>
  );
}

function LeadSummary({ lead }: { lead: SiteLead }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-[var(--atria-primary)]">
            {lead.name?.trim() || "Sem nome"}
          </p>
          <p className="text-xs text-[var(--atria-primary)]/50">
            {formatWhen(lead.createdAt)}
          </p>
        </div>
        <Badge variant={trafficVariant(lead.traffic)}>
          {labelFor(TRAFFIC_LABELS, lead.traffic)}
        </Badge>
      </div>
      <p className="text-sm text-[var(--atria-primary)]/70">
        {formatPhone(lead.phone)}
        {lead.email ? ` · ${lead.email}` : ""}
      </p>
      <p className="line-clamp-2 text-sm text-[var(--atria-primary)]/60">
        {lead.objective?.trim() || "Sem mensagem"}
      </p>
    </div>
  );
}

function LeadDialog({
  lead,
  onOpenChange,
}: {
  lead: SiteLead | null;
  onOpenChange: (open: boolean) => void;
}) {
  const instagram = instagramLabel(lead?.instagram);
  const instagramUrl = instagramHref(lead?.instagram);
  const phone = lead?.phone?.trim();
  const email = lead?.email?.trim();

  return (
    <Dialog open={lead != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-6 text-[var(--atria-primary)]">
            {lead?.name?.trim() || "Sem nome"}
          </DialogTitle>
          <DialogDescription>{formatWhen(lead?.createdAt)}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Badge variant={revenueVariant(lead?.revenue)}>
            {labelFor(REVENUE_LABELS, lead?.revenue)}
          </Badge>
          <Badge variant={trafficVariant(lead?.traffic)}>
            {labelFor(TRAFFIC_LABELS, lead?.traffic)}
          </Badge>
        </div>

        <div className="flex flex-col gap-2 text-sm text-[var(--atria-primary)]">
          <ContactLine icon={Phone} value={phone ? formatPhone(phone) : "Sem telefone"} />
          <ContactLine icon={Mail} value={email || "Sem e-mail"} />
          <ContactLine icon={AtSign} value={instagram || "Sem Instagram"} />
        </div>

        <div className="flex flex-wrap gap-2">
          {phone ? (
            <a
              href={toWhatsAppUrl(phone)}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ size: "sm" })}
            >
              <MessageCircle />
              WhatsApp
            </a>
          ) : null}
          {email ? (
            <a
              href={`mailto:${email}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Mail />
              E-mail
            </a>
          ) : null}
          {instagramUrl ? (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <AtSign />
              Instagram
            </a>
          ) : null}
        </div>

        <div className="max-h-64 overflow-y-auto rounded-xl bg-[var(--atria-primary)]/5 p-3">
          <p className="text-xs font-medium text-[var(--atria-primary)]/50">
            Mensagem
          </p>
          <p className="mt-2 text-sm whitespace-pre-wrap text-[var(--atria-primary)]">
            {lead?.objective?.trim() || "Este formulário não trouxe uma mensagem."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ContactLine({
  icon: Icon,
  value,
}: {
  icon: typeof Phone;
  value: string;
}) {
  return (
    <p className="flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-[var(--atria-primary)]/40" />
      <span className="min-w-0 break-all">{value}</span>
    </p>
  );
}

function LeadsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-2xl bg-[var(--atria-primary)]/5"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-[var(--atria-primary)]/5" />
    </div>
  );
}
