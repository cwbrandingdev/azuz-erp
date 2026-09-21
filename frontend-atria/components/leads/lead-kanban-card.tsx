"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Lock,
  MessageCircle,
  MessagesSquare,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/contexts/confirm-context";
import { LeadLocationText } from "@/components/leads/lead-location-text";
import { LeadCallButton } from "@/components/leads/lead-call-button";
import {
  getLeadStatusColor,
  getLeadStatusLabel,
  isLeadCollapsed,
  leadColumnKey,
} from "@/lib/leads-kanban-utils";
import {
  canMoveLeadToColumn,
  type CrmMoveZone,
} from "@/lib/lead-pipeline-zones";
import { toast } from "@/lib/toast";
import { toWhatsAppUrl } from "@/lib/lead-phone";
import type { Lead, LeadKanbanColumn } from "@/services/types";

interface LeadKanbanCardProps {
  lead: Lead;
  columns: LeadKanbanColumn[];
  crmMoveZone?: CrmMoveZone;
  columnLocked?: boolean;
  portalClientView?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  onStatusChange: (leadId: string, columnKey: string) => void;
  onCollapseChange: (leadId: string, isMinimized: boolean) => void;
  onOpenDetails: (lead: Lead) => void;
  onRemove?: (leadId: string) => void;
}

export function LeadKanbanCard({
  lead,
  columns,
  crmMoveZone = "all",
  columnLocked = false,
  portalClientView = false,
  dragHandleProps,
  onStatusChange,
  onCollapseChange,
  onOpenDetails,
  onRemove,
}: LeadKanbanCardProps) {
  const confirm = useConfirm();
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(() => isLeadCollapsed(lead));
  const [hovered, setHovered] = useState(false);
  const color = lead.statusColor ?? getLeadStatusColor(lead.status);
  const selectedColumnKey =
    columns.find((column) =>
      lead.stageId
        ? column.stageId === lead.stageId
        : leadColumnKey(column) === lead.status,
    ) ?? columns[0];
  const selectedKey = selectedColumnKey
    ? leadColumnKey(selectedColumnKey)
    : lead.status;
  const statusLabel =
    selectedColumnKey?.title ??
    lead.statusLabel ??
    getLeadStatusLabel(lead.status);

  const statusChangeDisabled = columnLocked;

  useEffect(() => {
    setCollapsed(isLeadCollapsed(lead));
  }, [lead.id, lead.isMinimized, lead.status]);

  async function handleCopy() {
    if (!lead.phone) return;
    try {
      await navigator.clipboard.writeText(lead.phone);
      setCopied(true);
      toast.success("Telefone copiado");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não foi possível copiar o telefone.");
    }
  }

  function handleToggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    onCollapseChange(lead.id, next);
  }

  function isColumnAllowed(columnStatus: string) {
    if (portalClientView) return true;
    return canMoveLeadToColumn(crmMoveZone, columnStatus);
  }

  async function handleRemove() {
    if (!onRemove) return;
    const confirmed = await confirm({
      title: "Remover do funil",
      description: `Remover "${lead.name}" do kanban? O lead continuará disponível na prospecção.`,
      confirmLabel: "Remover",
      destructive: true,
    });
    if (!confirmed) return;
    onRemove(lead.id);
  }

  return (
    <div
      className="group relative rounded-xl border bg-white p-3 shadow-sm"
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {columnLocked && hovered && (
        <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-[var(--atria-primary)]/8 px-2 py-0.5 text-[10px] font-medium text-[var(--atria-primary)]/60">
          <Lock className="size-3" />
          Bloqueado
        </span>
      )}

      <div className="flex items-start gap-2">
        {columnLocked ? (
          <span
            className="mt-0.5 text-[var(--atria-primary)]/25"
            aria-hidden
          >
            <Lock className="size-4" />
          </span>
        ) : (
          <button
            type="button"
            className="mt-0.5 cursor-grab text-[var(--atria-primary)]/35 hover:text-[var(--atria-primary)]/70 active:cursor-grabbing"
            aria-label="Arrastar lead"
            {...dragHandleProps}
          >
            <GripVertical className="size-4" />
          </button>
        )}
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpenDetails(lead)}
        >
          <p className="truncate text-sm font-semibold text-[var(--atria-primary)]">
            {lead.name}
          </p>
          {(lead.category || lead.source) && (
            <div className="mt-1 flex flex-wrap gap-1">
              {lead.category && (
                <Badge variant="outline" className="text-[10px]">
                  {lead.category}
                </Badge>
              )}
              {lead.source && (
                <Badge variant="secondary" className="text-[10px]">
                  {lead.source}
                </Badge>
              )}
            </div>
          )}
          {collapsed && (
            <p className="mt-1 truncate text-[10px] text-[var(--atria-primary)]/45">
              {statusLabel}
            </p>
          )}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-[var(--atria-primary)]/50 hover:text-[var(--atria-primary)]"
          onClick={handleToggleCollapse}
          aria-label={collapsed ? "Expandir lead" : "Minimizar lead"}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronUp className="size-4" />
          )}
        </Button>
      </div>

      {!collapsed && (
        <>
          <div className="mb-3 mt-2 min-w-0 space-y-1 pl-6 text-xs text-[var(--atria-primary)]/65">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="min-w-0 flex-1 truncate">
                {lead.phone ?? "Sem telefone"}
              </span>
              {lead.phone && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  onClick={() => void handleCopy()}
                  title="Copiar telefone"
                >
                  {copied ? (
                    <Check className="size-3.5 text-green-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              )}
            </div>
            {(lead.neighborhood || lead.city || lead.address) && (
              <LeadLocationText
                lead={lead}
                showAddress={false}
                primaryClassName="text-xs text-[var(--atria-primary)]/65"
              />
            )}
            <p className="truncate text-[10px] text-[var(--atria-primary)]/45">
              {statusLabel}
            </p>
          </div>

          <div className="flex flex-col gap-2 pl-6">
            {!statusChangeDisabled && (
              <>
                <label className="sr-only" htmlFor={`lead-status-${lead.id}`}>
                  Mover para status
                </label>
                <select
                  id={`lead-status-${lead.id}`}
                  value={selectedKey}
                  onChange={(event) =>
                    onStatusChange(lead.id, event.target.value)
                  }
                  className="h-8 w-full rounded-md border border-[var(--atria-primary)]/15 bg-white px-2 text-xs text-[var(--atria-primary)] outline-none focus:border-[var(--atria-accent)]"
                >
                  {columns.map((column) => {
                    const key = leadColumnKey(column);
                    const allowed = isColumnAllowed(column.status);
                    return (
                      <option key={key} value={key} disabled={!allowed}>
                        {column.title}
                      </option>
                    );
                  })}
                </select>
              </>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onOpenDetails(lead)}
            >
              <MessagesSquare className="size-3.5" />
              Comentários
            </Button>

            {!portalClientView && (
              <LeadCallButton lead={lead} className="w-full" />
            )}

            {lead.phone ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                render={
                  <a
                    href={toWhatsAppUrl(lead.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <MessageCircle className="size-3.5" />
                WhatsApp
              </Button>
            ) : null}

            {onRemove && !portalClientView && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => void handleRemove()}
              >
                <Trash2 className="size-3.5" />
                Remover do funil
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
