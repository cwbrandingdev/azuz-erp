"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

function templateButtonLabels(template: WhatsAppHsmTemplate): string[] {
  const labels: string[] = [];
  for (const component of template.components) {
    const type = component.type.toLowerCase();
    if (type !== "buttons" && type !== "button") continue;
    const raw = component as {
      buttons?: Array<{ text?: string; type?: string }>;
    };
    for (const button of raw.buttons ?? []) {
      if (button.text?.trim()) labels.push(button.text.trim());
    }
  }
  return labels;
}

function exampleOptionsForSlot(
  template: WhatsAppHsmTemplate,
  slotIndex: number,
): string[] {
  const body = template.components.find(
    (item) => item.type.toLowerCase() === "body",
  );
  const examples = body?.example?.body_text?.[0] ?? [];
  const unique = new Set<string>();
  if (examples[slotIndex]?.trim()) {
    unique.add(examples[slotIndex].trim());
  }
  for (const value of examples) {
    if (value?.trim()) unique.add(value.trim());
  }
  return [...unique];
}

function sortTemplatesWithButtonsFirst(items: WhatsAppHsmTemplate[]) {
  return [...items].sort((left, right) => {
    const leftButtons = templateButtonLabels(left).length;
    const rightButtons = templateButtonLabels(right).length;
    if (leftButtons !== rightButtons) return rightButtons - leftButtons;
    return left.name.localeCompare(right.name);
  });
}

export function WhatsappTemplateDialog({
  open,
  onOpenChange,
  onSend,
  sending,
  contactName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (input: {
    name: string;
    language: string;
    parameters: string[];
  }) => Promise<void>;
  sending: boolean;
  contactName?: string | null;
}) {
  const { data: templates = [], isLoading, isError } = useWhatsappTemplates(open);
  const sortedTemplates = useMemo(
    () => sortTemplatesWithButtonsFirst(templates),
    [templates],
  );
  const [selected, setSelected] = useState("");
  const [values, setValues] = useState<string[]>([]);

  const template = useMemo(
    () =>
      sortedTemplates.find((item) => `${item.name}:${item.language}` === selected),
    [selected, sortedTemplates],
  );
  const slots = template ? bodyPlaceholderCount(template) : 0;
  const buttonLabels = template ? templateButtonLabels(template) : [];

  const canSend =
    template &&
    (slots === 0 ||
      values.slice(0, slots).every((item) => item?.trim().length > 0));

  async function handleSend() {
    if (!template || !canSend) return;
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
        ) : sortedTemplates.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhum template aprovado. Cadastre modelos no Gerenciador do WhatsApp
            e preencha WHATSAPP_WABA_ID.
          </p>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-xs text-slate-500">
              Modelos com botões aparecem primeiro. O cliente toca nas opções
              aprovadas na Meta — não precisa digitar resposta livre.
            </p>
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
                {sortedTemplates.map((item) => {
                  const buttons = templateButtonLabels(item).length;
                  return (
                    <option
                      key={`${item.name}:${item.language}`}
                      value={`${item.name}:${item.language}`}
                    >
                      {item.name} · {item.language}
                      {buttons > 0 ? ` · ${buttons} botão(ões)` : ""} ·{" "}
                      {item.status}
                    </option>
                  );
                })}
              </select>
            </label>
            {template ? (
              <>
                <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                  {bodyPreview(template) || "Sem corpo de texto"}
                </p>
                {buttonLabels.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {buttonLabels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-900"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
                {Array.from({ length: slots }, (_, index) => {
                  const options = exampleOptionsForSlot(template, index);
                  const presets = [
                    ...(contactName?.trim() ? [contactName.trim()] : []),
                    ...options,
                  ];
                  const uniquePresets = [...new Set(presets.filter(Boolean))];
                  return (
                    <label
                      key={index}
                      className="flex flex-col gap-1 text-xs font-medium text-slate-500"
                    >
                      Variável {index + 1}
                      {uniquePresets.length > 0 ? (
                        <select
                          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                          value={values[index] ?? ""}
                          onChange={(event) =>
                            setValues((current) => {
                              const next = [...current];
                              next[index] = event.target.value;
                              return next;
                            })
                          }
                        >
                          <option value="">Escolha um valor</option>
                          {uniquePresets.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
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
                      )}
                    </label>
                  );
                })}
                <Button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || !canSend}
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
