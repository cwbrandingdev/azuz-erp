"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LeadOwnerSelect } from "@/components/leads/lead-owner-select";
import {
  LeadOrganizationSelect,
  resolveOrganizationIdForPayload,
} from "@/components/leads/lead-organization-select";
import {
  downloadLeadsImportTemplate,
  readLeadsFromArrayBuffer,
} from "@/lib/leads-import";
import { toast } from "@/lib/toast";
import { leadsService } from "@/services";
import type { AddLeadToKanbanInput, CrmUserOption } from "@/services/types";

interface LeadKanbanImportDialogProps {
  onSuccess: () => void;
  owners?: CrmUserOption[];
  defaultOwnerUserId?: string;
  requireOwner?: boolean;
}

export function LeadKanbanImportDialog({
  onSuccess,
  owners = [],
  defaultOwnerUserId,
  requireOwner = false,
}: LeadKanbanImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);
  const [leads, setLeads] = useState<AddLeadToKanbanInput[]>([]);
  const [organizationValue, setOrganizationValue] = useState("");
  const [ownerUserId, setOwnerUserId] = useState(defaultOwnerUserId ?? "");

  useEffect(() => {
    if (open) setOwnerUserId(defaultOwnerUserId ?? "");
  }, [defaultOwnerUserId, open]);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      if (!data) return;

      try {
        const parsed = readLeadsFromArrayBuffer(data as ArrayBuffer);
        setLeads(parsed);
        setPreviewCount(parsed.length);

        if (parsed.length === 0) {
          toast.error(
            "Nenhuma linha válida encontrada. Use a coluna Empresa (nome).",
          );
        }
      } catch {
        toast.error("Não foi possível ler o arquivo.");
        setLeads([]);
        setPreviewCount(0);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    if (leads.length === 0) return;

    const organizationId = resolveOrganizationIdForPayload(organizationValue);
    if (!organizationId) {
      toast.error("Selecione a empresa cliente.");
      return;
    }

    if (requireOwner && !ownerUserId) {
      toast.error("Selecione o responsável pelo lead.");
      return;
    }

    setLoading(true);
    let added = 0;
    let failed = 0;

    try {
      for (const lead of leads) {
        try {
          await leadsService.addToKanban({
            ...lead,
            organizationId,
            ...(ownerUserId ? { ownerUserId } : {}),
          });
          added += 1;
        } catch {
          failed += 1;
        }
      }

      if (added > 0) {
        toast.success(`${added} lead(s) adicionados ao kanban.`);
        setOpen(false);
        setLeads([]);
        setPreviewCount(0);
        onSuccess();
      }

      if (failed > 0) {
        toast.error(`${failed} linha(s) não puderam ser importadas.`);
      }

      if (added === 0 && failed === 0) {
        toast.error("Nenhum lead importado.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadTemplate() {
    setDownloadingTemplate(true);
    try {
      await downloadLeadsImportTemplate();
    } catch {
      toast.error("Não foi possível baixar o modelo.");
    } finally {
      setDownloadingTemplate(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="border-[var(--atria-primary)]/20 text-[var(--atria-primary)]"
          />
        }
      >
        <FileSpreadsheet className="size-4" />
        Importar Excel
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[var(--atria-primary)]">
            Importar leads para o kanban
          </DialogTitle>
        </DialogHeader>
        <LeadOrganizationSelect
          value={organizationValue}
          onChange={setOrganizationValue}
          id="kanban-import-organization"
        />
        {requireOwner && (
          <LeadOwnerSelect
            id="kanban-import-owner"
            value={ownerUserId}
            onChange={setOwnerUserId}
            owners={owners}
            required
          />
        )}
        <p className="text-sm text-[var(--atria-primary)]/55">
          Compatível com exportações LeadMiner (Empresa, Telefone, Website,
          Endereço, Cidade, Categoria, Link Maps) e planilhas simples com
          cabeçalho na primeira linha.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit text-[var(--atria-primary)]"
          disabled={downloadingTemplate}
          onClick={() => void handleDownloadTemplate()}
        >
          {downloadingTemplate ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Baixar modelo
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-4" />
          Selecionar arquivo
        </Button>
        {previewCount > 0 && (
          <p className="text-sm text-[var(--atria-primary)]">
            {previewCount} lead(s) prontos para adicionar ao kanban.
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={loading || leads.length === 0}
            className="bg-[var(--atria-primary)] text-white"
            onClick={() => void handleImport()}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
