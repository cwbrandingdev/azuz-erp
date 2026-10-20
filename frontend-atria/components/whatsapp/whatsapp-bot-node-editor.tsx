"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  WhatsAppBotNode,
  WhatsAppBotNodeType,
} from "@/services/whatsapp.service";

const NODE_TYPES: Array<{ id: WhatsAppBotNodeType; label: string }> = [
  { id: "message", label: "Mensagem" },
  { id: "menu", label: "Menu" },
  { id: "question", label: "Pergunta" },
  { id: "ai", label: "IA" },
  { id: "handoff", label: "Transferir" },
];

export function WhatsappBotNodeEditor({
  node,
  nodeIds,
  isStart,
  onSetStart,
  onUpdate,
  onRemove,
}: {
  node: WhatsAppBotNode;
  nodeIds: string[];
  isStart: boolean;
  onSetStart: () => void;
  onUpdate: (patch: Partial<WhatsAppBotNode>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700">{node.id}</span>
        <div className="flex gap-2">
          {!isStart ? (
            <Button type="button" size="sm" variant="outline" onClick={onSetStart}>
              Definir início
            </Button>
          ) : (
            <span className="text-[10px] font-medium text-[var(--atria-primary)]">
              Passo inicial
            </span>
          )}
          <button
            type="button"
            className="text-xs text-red-600"
            onClick={onRemove}
          >
            Remover
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
          value={node.type}
          onChange={(event) =>
            onUpdate({ type: event.target.value as WhatsAppBotNodeType })
          }
        >
          {NODE_TYPES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
          value={node.nextId ?? ""}
          onChange={(event) =>
            onUpdate({ nextId: event.target.value || null })
          }
        >
          <option value="">Próximo passo</option>
          {nodeIds
            .filter((id) => id !== node.id)
            .map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
        </select>
      </div>
      <textarea
        className="mt-2 min-h-16 w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
        placeholder="Texto (use {{primeiro_nome}})"
        value={node.text ?? ""}
        onChange={(event) => onUpdate({ text: event.target.value })}
      />
      {node.type === "question" ? (
        <Input
          className="mt-2 h-8 text-xs"
          placeholder="Campo coletado (ex: nome)"
          value={node.field ?? ""}
          onChange={(event) => onUpdate({ field: event.target.value })}
        />
      ) : null}
      {node.type === "menu" ? (
        <>
          <p className="mt-2 text-[10px] text-slate-500">
            No WhatsApp: até 3 opções viram botões; de 4 a 10 viram lista
            clicável. Títulos longos são encurtados automaticamente.
          </p>
          {(node.options ?? []).map((option, optionIndex) => (
            <div key={optionIndex} className="mt-2 grid grid-cols-3 gap-1">
              <Input
                className="h-8 text-xs"
                placeholder="ID"
                value={option.key}
                onChange={(event) => {
                  const options = [...(node.options ?? [])];
                  options[optionIndex] = {
                    ...option,
                    key: event.target.value,
                  };
                  onUpdate({ options });
                }}
              />
              <Input
                className="h-8 text-xs"
                placeholder="Rótulo"
                value={option.label}
                onChange={(event) => {
                  const options = [...(node.options ?? [])];
                  options[optionIndex] = {
                    ...option,
                    label: event.target.value,
                  };
                  onUpdate({ options });
                }}
              />
              <select
                className="h-8 rounded-md border border-slate-200 bg-white px-1 text-xs"
                value={option.nextId ?? ""}
                onChange={(event) => {
                  const options = [...(node.options ?? [])];
                  options[optionIndex] = {
                    ...option,
                    nextId: event.target.value || null,
                  };
                  onUpdate({ options });
                }}
              >
                <option value="">Destino</option>
                {nodeIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={(node.options?.length ?? 0) >= 10}
            onClick={() =>
              onUpdate({
                options: [
                  ...(node.options ?? []),
                  {
                    key: String((node.options?.length ?? 0) + 1),
                    label: "Nova opção",
                    nextId: null,
                  },
                ],
              })
            }
          >
            Adicionar opção
          </Button>
        </>
      ) : null}
    </div>
  );
}
