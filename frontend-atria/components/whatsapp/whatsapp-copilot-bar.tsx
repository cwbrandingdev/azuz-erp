"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWhatsappMutations } from "@/hooks/use-whatsapp";
import { toast } from "@/lib/toast";
import type { WhatsAppCopilotAction } from "@/services/whatsapp.service";

export function WhatsappCopilotBar({
  phone,
  draft,
  onUse,
}: {
  phone: string;
  draft: string;
  onUse: (text: string) => void;
}) {
  const { runCopilot } = useWhatsappMutations();
  const [tone, setTone] = useState<"formal" | "casual" | "empathetic">("formal");
  const [suggestion, setSuggestion] = useState<string | null>(null);

  async function run(action: WhatsAppCopilotAction) {
    try {
      const result = await runCopilot.mutateAsync({
        phone,
        action,
        text: draft,
        tone: action === "tone" ? tone : undefined,
      });
      setSuggestion(result.text);
    } catch {
      toast.error("Não foi possível gerar o texto do copiloto.");
    }
  }

  return (
    <div className="mb-2 rounded-lg border border-violet-100 bg-violet-50/70 p-2">
      <div className="flex flex-wrap items-center gap-1">
        <Sparkles className="mr-1 size-3.5 text-violet-600" />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px]"
          disabled={runCopilot.isPending}
          onClick={() => void run("suggest")}
        >
          Sugerir
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px]"
          disabled={runCopilot.isPending}
          onClick={() => void run("rewrite")}
        >
          Reescrever
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px]"
          disabled={runCopilot.isPending}
          onClick={() => void run("grammar")}
        >
          Gramática
        </Button>
        <select
          className="h-7 rounded-md border border-violet-200 bg-white px-1 text-[11px]"
          value={tone}
          onChange={(event) =>
            setTone(event.target.value as "formal" | "casual" | "empathetic")
          }
        >
          <option value="formal">Formal</option>
          <option value="casual">Casual</option>
          <option value="empathetic">Empático</option>
        </select>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px]"
          disabled={runCopilot.isPending}
          onClick={() => void run("tone")}
        >
          Tom
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px]"
          disabled={runCopilot.isPending}
          onClick={() => void run("summarize")}
        >
          Resumir
        </Button>
        {runCopilot.isPending ? (
          <span className="text-[11px] text-violet-600">Gerando…</span>
        ) : null}
      </div>
      {suggestion ? (
        <div className="mt-2 rounded-md bg-white p-2 text-xs text-slate-700">
          <p className="whitespace-pre-wrap">{suggestion}</p>
          <Button
            type="button"
            size="sm"
            className="mt-2 h-7"
            onClick={() => {
              onUse(suggestion);
              setSuggestion(null);
            }}
          >
            Usar no rascunho
          </Button>
        </div>
      ) : null}
    </div>
  );
}
