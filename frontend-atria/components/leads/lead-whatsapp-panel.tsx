"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toWhatsAppUrl } from "@/lib/lead-phone";
import { toast } from "@/lib/toast";
import { whatsappService } from "@/services";
import type { WhatsappConfig, WhatsappMessage } from "@/services/types";

function formatMessageDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface LeadWhatsAppPanelProps {
  leadId: string;
  phone: string | null;
}

export function LeadWhatsAppPanel({ leadId, phone }: LeadWhatsAppPanelProps) {
  const [config, setConfig] = useState<WhatsappConfig | null>(null);
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [showTemplate, setShowTemplate] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [nextConfig, conversations] = await Promise.all([
          whatsappService.getWhatsappConfig(),
          whatsappService.listWhatsappConversations({ leadId }),
        ]);
        if (cancelled) return;
        setConfig(nextConfig);

        const conversation = conversations[0];
        if (!conversation) {
          setMessages([]);
          return;
        }
        const thread = await whatsappService.listWhatsappMessages(
          conversation.id,
        );
        if (!cancelled) setMessages(thread);
      } catch {
        if (!cancelled) {
          setConfig(null);
          setMessages([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const text = body.trim();
    const template = templateName.trim();
    if (!text && !template) {
      toast.error("Escreva uma mensagem ou informe um template.");
      return;
    }

    setSending(true);
    try {
      const sent = await whatsappService.sendWhatsappMessage({
        leadId,
        ...(text ? { body: text } : {}),
        ...(template
          ? { templateName: template, templateLanguage: "pt_BR" }
          : {}),
      });
      setMessages((current) => [...current, sent]);
      setBody("");
      setTemplateName("");
    } catch {
      /* toast handled by api */
    } finally {
      setSending(false);
    }
  }

  const configured = Boolean(config?.configured);
  const waUrl = phone ? toWhatsAppUrl(phone) : null;

  return (
    <section className="rounded-xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-[#128C7E]" />
          <h3 className="text-sm font-semibold text-[var(--atria-primary)]">
            WhatsApp
          </h3>
        </div>
        {waUrl ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="gap-1"
            render={
              <a href={waUrl} target="_blank" rel="noopener noreferrer" />
            }
          >
            <ExternalLink className="size-3" />
            Abrir app
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex min-h-16 items-center justify-center">
          <Loader2 className="size-4 animate-spin text-[var(--atria-primary)]" />
        </div>
      ) : (
        <>
          {!configured && (
            <p className="mb-3 text-xs text-[var(--atria-primary)]/50">
              API ainda não configurada. Use “Abrir app” ou preencha o token em
              Configurações → Integrações APIs.
            </p>
          )}

          {messages.length === 0 ? (
            <p className="mb-3 text-xs text-[var(--atria-primary)]/45">
              Nenhuma mensagem nesta conversa ainda.
            </p>
          ) : (
            <div className="mb-3 max-h-56 space-y-2 overflow-y-auto">
              {messages.map((message) => {
                const outbound = message.direction === "OUTBOUND";
                return (
                  <div
                    key={message.id}
                    className={`flex ${outbound ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-xs shadow-sm ${
                        outbound
                          ? "bg-[#DCF8C6] text-[var(--atria-primary)]"
                          : "bg-white ring-1 ring-[var(--atria-primary)]/8"
                      }`}
                    >
                      {message.templateName && (
                        <p className="mb-0.5 font-medium opacity-70">
                          Template: {message.templateName}
                        </p>
                      )}
                      {message.body && (
                        <p className="whitespace-pre-wrap">{message.body}</p>
                      )}
                      <p className="mt-1 text-[10px] opacity-50">
                        {formatMessageDate(message.createdAt)}
                        {outbound ? ` · ${message.status}` : ""}
                        {message.errorMessage ? ` · ${message.errorMessage}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <form onSubmit={(event) => void handleSend(event)} className="space-y-2">
            <Field>
              <FieldLabel htmlFor={`wa-body-${leadId}`} className="sr-only">
                Mensagem
              </FieldLabel>
              <textarea
                id={`wa-body-${leadId}`}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={
                  configured
                    ? "Mensagem (janela de 24h)..."
                    : "Configure a API para enviar daqui"
                }
                rows={2}
                disabled={!configured}
                className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm disabled:opacity-50"
              />
            </Field>
            {showTemplate ? (
              <Field>
                <FieldLabel htmlFor={`wa-template-${leadId}`}>
                  Template (fora da janela de 24h)
                </FieldLabel>
                <Input
                  id={`wa-template-${leadId}`}
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="nome_do_template_aprovado"
                  disabled={!configured}
                />
              </Field>
            ) : (
              <button
                type="button"
                className="text-xs text-[var(--atria-primary)]/50 underline-offset-2 hover:underline"
                onClick={() => setShowTemplate(true)}
              >
                Enviar template da Meta
              </button>
            )}
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={
                  sending || !configured || (!body.trim() && !templateName.trim())
                }
                className="gap-2 bg-[#128C7E] text-white hover:bg-[#128C7E]/90"
              >
                {sending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                Enviar
              </Button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
