"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LEAD_STATUS_LABELS } from "@/lib/leads-kanban-utils";
import { toast } from "@/lib/toast";
import {
  useWhatsappCrm,
  useWhatsappMutations,
} from "@/hooks/use-whatsapp";
import { leadsService } from "@/services";

export function WhatsappCrmPanel({ phone }: { phone: string }) {
  const { data, isLoading } = useWhatsappCrm(phone);
  const { updateCrmContact, deleteCrmContact, invalidate } =
    useWhatsappMutations();
  const [deleteContactOpen, setDeleteContactOpen] = useState(false);
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

  useEffect(() => {
    if (!contact) return;
    setName(contact.name ?? "");
    setContactName(contact.contactName ?? "");
    setEmail(contact.email ?? "");
    setCnpj(contact.cnpj ?? "");
    setJobTitle(contact.jobTitle ?? "");
    setSource(contact.source ?? "");
  }, [contact]);

  async function save(patch: {
    name?: string;
    contactName?: string | null;
    email?: string | null;
    cnpj?: string | null;
    jobTitle?: string | null;
    source?: string;
  }) {
    try {
      await updateCrmContact.mutateAsync({ phone, ...patch });
    } catch {
      toast.error("Não foi possível salvar o contato.");
    }
  }

  if (isLoading) {
    return <p className="text-xs text-slate-400 dark:text-white/40">Carregando CRM…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 dark:text-muted-foreground uppercase">
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
        </div>
        {!contact ? (
          <p className="mt-2 text-[11px] text-slate-400 dark:text-white/40">
            Salve um nome para criar o lead neste número.
          </p>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 w-full border-red-200 dark:border-red-400/30 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-400/10 hover:text-red-800 dark:hover:text-red-300"
            onClick={() => setDeleteContactOpen(true)}
            disabled={deleteCrmContact.isPending}
          >
            <Trash2 className="mr-1.5 size-3.5" />
            Excluir contato
          </Button>
        )}
      </div>

      {contact ? (
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-muted-foreground">
          Etapa do funil
          <select
            className="h-8 rounded-md border border-slate-200 dark:border-border bg-white px-2 text-sm text-slate-800 dark:text-foreground"
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
          <span className="font-normal text-slate-400 dark:text-white/40">
            {LEAD_STATUS_LABELS[
              contact.status as keyof typeof LEAD_STATUS_LABELS
            ] ?? contact.status}
          </span>
        </label>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 dark:text-muted-foreground uppercase">
          Histórico
        </p>
        {(data?.timeline ?? []).length === 0 ? (
          <p className="text-[11px] text-slate-400 dark:text-white/40">Sem interações ainda.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {(data?.timeline ?? []).map((item) => (
              <li key={item.id} className="border-l-2 border-slate-200 dark:border-border pl-2 text-[11px]">
                <p className="font-medium text-slate-700 dark:text-foreground/85">{item.title}</p>
                {item.body ? (
                  <p className="line-clamp-3 whitespace-pre-wrap text-slate-500 dark:text-muted-foreground">
                    {item.body}
                  </p>
                ) : null}
                <p className="text-slate-400 dark:text-white/40">
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

      <AlertDialog open={deleteContactOpen} onOpenChange={setDeleteContactOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
            <AlertDialogDescription>
              O lead vinculado a este número será removido do funil (exclusão
              lógica). A conversa no WhatsApp não é apagada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="bg-red-700 hover:bg-red-800"
              disabled={deleteCrmContact.isPending}
              onClick={() => {
                void deleteCrmContact
                  .mutateAsync(phone)
                  .then(() => {
                    toast.success("Contato excluído.");
                    setDeleteContactOpen(false);
                  })
                  .catch(() =>
                    toast.error("Não foi possível excluir o contato."),
                  );
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
