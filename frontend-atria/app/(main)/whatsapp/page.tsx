"use client";

import { useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import * as whatsappService from "@/services/whatsapp.service";

export default function WhatsappPage() {
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    if (!to.trim() || !body.trim()) {
      toast.error("Informe o número e a mensagem.");
      return;
    }

    setSending(true);
    try {
      await whatsappService.sendMessage({
        to: to.trim(),
        body: body.trim(),
      });
      toast.success("Mensagem enviada.");
      setBody("");
    } catch {
      // apiRequest already toasts the Meta error
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-[var(--atria-primary)]/10 bg-[var(--atria-accent)]/20 p-3 text-[var(--atria-primary)]">
          <MessageCircle className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
            WhatsApp
          </h1>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Envie uma mensagem de texto. O número precisa ter falado com você
            nas últimas 24h (janela da Meta).
          </p>
        </div>
      </div>

      <div className="max-w-xl rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-6 shadow-sm">
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="whatsapp-to">Número</FieldLabel>
            <Input
              id="whatsapp-to"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="5511999999999"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="whatsapp-body">Mensagem</FieldLabel>
            <textarea
              id="whatsapp-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              placeholder="Escreva a mensagem..."
              className="w-full rounded-xl border border-[var(--atria-primary)]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--atria-primary)]/35"
            />
          </Field>

          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={sending || !to.trim() || !body.trim()}
            className="w-full sm:w-auto"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : "Enviar"}
          </Button>
        </FieldGroup>
      </div>
    </div>
  );
}
