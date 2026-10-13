"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useWhatsappTemplates } from "@/hooks/use-whatsapp";
import type { WhatsAppHsmTemplate } from "@/services/whatsapp.service";

function bodyPlaceholderCount(template: WhatsAppHsmTemplate) {
  const body = template.components.find(
    (item) => item.type.toLowerCase() === "body",
  );
  const matches = body?.text?.match(/\{\{\d+\}\}/g) ?? [];
  return new Set(matches).size;
}

function bodyPreview(template: WhatsAppHsmTemplate) {
  return (
    template.components.find((item) => item.type.toLowerCase() === "body")
      ?.text ?? ""
  );
}

export function WhatsappTemplateDialog({
  open,
  onOpenChange,
  onSend,
  sending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (input: {
    name: string;
    language: string;
    parameters: string[];
  }) => Promise<void>;
  sending: boolean;
}) {
  const { data: templates = [], isLoading, isError } = useWhatsappTemplates(open);
  const [selected, setSelected] = useState("");
  const [values, setValues] = useState<string[]>([]);

  const template = useMemo(
    () => templates.find((item) => `${item.name}:${item.language}` === selected),
    [selected, templates],
  );
  const slots = template ? bodyPlaceholderCount(template) : 0;

  async function handleSend() {
    if (!template) return;
    await onSend({
      name: template.name,
      language: template.language,
      parameters: values.slice(0, slots),
    });
    onOpenChange(false);
    setValues([]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Template HSM</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-slate-500">Carregando modelos da Meta…</p>
        ) : isError ? (
          <p className="text-sm text-red-600">
            Não foi possível listar templates. Confira WHATSAPP_WABA_ID e se os
            modelos estão aprovados.
          </p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhum template aprovado. Cadastre modelos no Gerenciador do WhatsApp
            e preencha WHATSAPP_WABA_ID.
          </p>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              Modelo
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                value={selected}
                onChange={(event) => {
                  setSelected(event.target.value);
                  setValues([]);
                }}
              >
                <option value="">Selecione</option>
                {templates.map((item) => (
                  <option
                    key={`${item.name}:${item.language}`}
                    value={`${item.name}:${item.language}`}
                  >
                    {item.name} · {item.language} · {item.status}
                  </option>
                ))}
              </select>
            </label>
            {template ? (
              <>
                <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                  {bodyPreview(template) || "Sem corpo de texto"}
                </p>
                {Array.from({ length: slots }, (_, index) => (
                  <Input
                    key={index}
                    placeholder={`{{${index + 1}}}`}
                    value={values[index] ?? ""}
                    onChange={(event) =>
                      setValues((current) => {
                        const next = [...current];
                        next[index] = event.target.value;
                        return next;
                      })
                    }
                  />
                ))}
                <Button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={
                    sending ||
                    values.filter((item) => item?.trim()).length < slots
                  }
                >
                  Enviar template
                </Button>
              </>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
