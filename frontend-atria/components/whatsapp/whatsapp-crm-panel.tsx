"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { LEAD_STATUS_LABELS } from "@/lib/leads-kanban-utils";
import { toast } from "@/lib/toast";
import {
  useWhatsappCrm,
  useWhatsappMutations,
} from "@/hooks/use-whatsapp";
import { leadsService } from "@/services";

const DEAL_KIND: Record<string, string> = {
  lead: "Lead",
  proposal: "Proposta",
  contract: "Contrato",
};

function money(value: number | null) {
  if (value == null) return null;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function WhatsappCrmPanel({ phone }: { phone: string }) {
  const { data, isLoading } = useWhatsappCrm(phone);
  const { updateCrmContact, invalidate } = useWhatsappMutations();
  const stagesQuery = useQuery({
    queryKey: ["whatsapp-stages"],
    queryFn: () => leadsService.listLeadStages(),
  });
  const contact = data?.contact ?? null;

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [source, setSource] = useState("");
  const [orcamento, setOrcamento] = useState("");

  useEffect(() => {
    if (!contact) return;
    setName(contact.name ?? "");
    setContactName(contact.contactName ?? "");
    setEmail(contact.email ?? "");
    setCnpj(contact.cnpj ?? "");
    setJobTitle(contact.jobTitle ?? "");
    setSource(contact.source ?? "");
    setOrcamento(contact.orcamento != null ? String(contact.orcamento) : "");
  }, [contact]);

  async function save(patch: {
    name?: string;
    contactName?: string | null;
    email?: string | null;
    cnpj?: string | null;
    jobTitle?: string | null;
    source?: string;
    orcamento?: number | null;
  }) {
    try {
      await updateCrmContact.mutateAsync({ phone, ...patch });
    } catch {
      toast.error("Não foi possível salvar o contato.");
    }
  }

  if (isLoading) {
    return <p className="text-xs text-slate-400">Carregando CRM…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Contato
        </p>
        <div className="flex flex-col gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => {
              if (name !== (contact?.name ?? "")) void save({ name });
            }}
            placeholder="Nome / empresa"
            className="h-8 text-sm"
          />
          <Input
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            onBlur={() => {
              if (contactName !== (contact?.contactName ?? "")) {
                void save({ contactName: contactName || null });
              }
            }}
            placeholder="Contato"
            className="h-8 text-sm"
          />
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => {
              if (email !== (contact?.email ?? "")) {
                void save({ email: email || null });
              }
            }}
            placeholder="E-mail"
            className="h-8 text-sm"
          />
          <Input
            value={cnpj}
            onChange={(event) => setCnpj(event.target.value)}
            onBlur={() => {
              if (cnpj !== (contact?.cnpj ?? "")) {
                void save({ cnpj: cnpj || null });
              }
            }}
            placeholder="CNPJ"
            className="h-8 text-sm"
          />
          <Input
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            onBlur={() => {
              if (jobTitle !== (contact?.jobTitle ?? "")) {
                void save({ jobTitle: jobTitle || null });
              }
            }}
            placeholder="Cargo"
            className="h-8 text-sm"
          />
          <Input
            value={source}
            onChange={(event) => setSource(event.target.value)}
            onBlur={() => {
              if (source !== (contact?.source ?? "")) void save({ source });
            }}
            placeholder="Origem do lead"
            className="h-8 text-sm"
          />
          <Input
            value={orcamento}
            onChange={(event) => setOrcamento(event.target.value)}
            onBlur={() => {
              const next = orcamento.trim()
                ? Number(orcamento.replace(",", "."))
                : null;
              const current = contact?.orcamento ?? null;
              if (next !== current) {
                void save({ orcamento: Number.isFinite(next) ? next : null });
              }
            }}
            placeholder="Ticket estimado"
            className="h-8 text-sm"
          />
        </div>
        {!contact ? (
          <p className="mt-2 text-[11px] text-slate-400">
            Salve um nome para criar o lead neste número.
          </p>
        ) : null}
      </div>

      {contact ? (
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Etapa do funil
          <select
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
            value={contact.stageId ?? ""}
            onChange={(event) => {
              const stageId = event.target.value;
              if (!stageId || !contact.id) return;
              void leadsService
                .updateLeadStatus(contact.id, { stageId })
                .then(() => {
                  toast.success("Etapa atualizada.");
                  void invalidate();
                })
                .catch(() => toast.error("Não foi possível mover o card."));
            }}
          >
            <option value="">Selecionar</option>
            {(stagesQuery.data ?? []).map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
          <span className="font-normal text-slate-400">
            {LEAD_STATUS_LABELS[
              contact.status as keyof typeof LEAD_STATUS_LABELS
            ] ?? contact.status}
          </span>
        </label>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Negócios abertos
        </p>
        {(data?.openDeals ?? []).length === 0 ? (
          <p className="text-[11px] text-slate-400">Nenhum negócio aberto.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {(data?.openDeals ?? []).map((deal) => (
              <li
                key={`${deal.kind}-${deal.id}`}
                className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5 text-xs"
              >
                <p className="font-medium text-slate-800">{deal.title}</p>
                <p className="text-slate-500">
                  {DEAL_KIND[deal.kind] ?? deal.kind} · {deal.status}
                  {money(deal.value) ? ` · ${money(deal.value)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Histórico
        </p>
        {(data?.timeline ?? []).length === 0 ? (
          <p className="text-[11px] text-slate-400">Sem interações ainda.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {(data?.timeline ?? []).map((item) => (
              <li key={item.id} className="border-l-2 border-slate-200 pl-2 text-[11px]">
                <p className="font-medium text-slate-700">{item.title}</p>
                {item.body ? (
                  <p className="line-clamp-3 whitespace-pre-wrap text-slate-500">
                    {item.body}
                  </p>
                ) : null}
                <p className="text-slate-400">
                  {item.actorName ? `${item.actorName} · ` : ""}
                  {new Date(item.createdAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
