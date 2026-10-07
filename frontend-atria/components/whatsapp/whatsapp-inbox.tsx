"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { whatsappService } from "@/services";
import type {
  WhatsappConfig,
  WhatsappConversation,
  WhatsappMessage,
} from "@/services/types";

function formatTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function conversationTitle(conversation: WhatsappConversation) {
  return (
    conversation.lead?.name ||
    conversation.client?.name ||
    conversation.phone ||
    conversation.waId
  );
}

export function WhatsappInbox() {
  const searchParams = useSearchParams();
  const leadIdFilter = searchParams.get("leadId");
  const [config, setConfig] = useState<WhatsappConfig | null>(null);
  const [conversations, setConversations] = useState<WhatsappConversation[]>(
    [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState("");
  const threadEnd = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  async function loadConversations(preferredLeadId?: string | null) {
    const list = await whatsappService.listWhatsappConversations(
      preferredLeadId ? { leadId: preferredLeadId } : undefined,
    );
    setConversations(list);
    setSelectedId((current) => {
      if (current && list.some((item) => item.id === current)) return current;
      const fromLead = preferredLeadId
        ? list.find((item) => item.leadId === preferredLeadId)
        : null;
      return fromLead?.id ?? list[0]?.id ?? null;
    });
    return list;
  }

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      whatsappService.getWhatsappConfig(),
      whatsappService.listWhatsappConversations(
        leadIdFilter ? { leadId: leadIdFilter } : undefined,
      ),
    ])
      .then(([nextConfig, list]) => {
        if (cancelled) return;
        setConfig(nextConfig);
        setConversations(list);
        const fromLead = leadIdFilter
          ? list.find((item) => item.leadId === leadIdFilter)
          : null;
        setSelectedId(fromLead?.id ?? list[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setConfig(null);
          setConversations([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });

    return () => {
      cancelled = true;
    };
  }, [leadIdFilter]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoadingThread(true);
    whatsappService
      .listWhatsappMessages(selectedId)
      .then((thread) => {
        if (!cancelled) setMessages(thread);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingThread(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadConversations(leadIdFilter);
      if (!selectedId) return;
      whatsappService
        .listWhatsappMessages(selectedId)
        .then(setMessages)
        .catch(() => undefined);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [leadIdFilter, selectedId]);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text || !selected) return;

    setSending(true);
    try {
      const sent = await whatsappService.sendWhatsappMessage({
        body: text,
        ...(selected.leadId
          ? { leadId: selected.leadId }
          : { to: selected.waId }),
        ...(selected.clientId ? { clientId: selected.clientId } : {}),
      });
      setMessages((current) => [...current, sent]);
      setBody("");
      await loadConversations(leadIdFilter);
    } catch {
      toast.error("Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  }

  if (loadingList) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-[var(--atria-primary)]/10 bg-white">
        <Loader2 className="size-6 animate-spin text-[var(--atria-primary)]" />
      </div>
    );
  }

  if (!config?.configured) {
    return (
      <div className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-8">
        <MessageCircle className="size-8 text-[#128C7E]" />
        <h2 className="mt-4 text-lg font-semibold text-[var(--atria-primary)]">
          WhatsApp ainda não está conectado
        </h2>
        <p className="mt-2 max-w-md text-sm text-[var(--atria-primary)]/55">
          Em Integrações APIs, clique em Conectar WhatsApp e leia o QR no
          WhatsApp Business. Depois as conversas aparecem aqui.
        </p>
        <Button
          className="mt-5 bg-[#128C7E] text-white hover:bg-[#128C7E]/90"
          render={<Link href="/settings/api-integrations" />}
        >
          Ir para Integrações
        </Button>
      </div>
    );
  }

  return (
    <div className="grid min-h-[70vh] overflow-hidden rounded-2xl border border-[var(--atria-primary)]/10 bg-white lg:grid-cols-[20rem_1fr]">
      <aside className="border-b border-[var(--atria-primary)]/10 lg:border-b-0 lg:border-r">
        <div className="border-b border-[var(--atria-primary)]/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--atria-primary)]">
            Conversas
          </h2>
        </div>
        {conversations.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--atria-primary)]/45">
            Nenhuma conversa ainda. Envie pelo lead ou aguarde uma mensagem.
          </p>
        ) : (
          <ul className="max-h-[28vh] overflow-y-auto lg:max-h-[calc(70vh-3rem)]">
            {conversations.map((conversation) => {
              const active = conversation.id === selectedId;
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    className={cn(
                      "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors",
                      active
                        ? "bg-[#128C7E]/10"
                        : "hover:bg-[var(--atria-primary)]/5",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-[var(--atria-primary)]">
                        {conversationTitle(conversation)}
                      </span>
                      {conversation.unreadCount > 0 ? (
                        <span className="rounded-full bg-[#128C7E] px-1.5 text-[10px] font-bold text-white">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <span className="truncate text-xs text-[var(--atria-primary)]/45">
                      {conversation.lastMessagePreview || "Sem mensagens"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <section className="flex min-h-[42vh] flex-col">
        {selected ? (
          <>
            <header className="flex items-center justify-between gap-3 border-b border-[var(--atria-primary)]/10 px-4 py-3">
              <div>
                <p className="font-semibold text-[var(--atria-primary)]">
                  {conversationTitle(selected)}
                </p>
                <p className="text-xs text-[var(--atria-primary)]/45">
                  {selected.phone || selected.waId}
                </p>
              </div>
              {selected.leadId ? (
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/leads?leadId=${selected.leadId}`} />}
                >
                  Lead
                </Button>
              ) : null}
            </header>

            <div className="flex-1 space-y-2 overflow-y-auto bg-[#efeae2] px-4 py-4">
              {loadingThread ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-[var(--atria-primary)]" />
                </div>
              ) : messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--atria-primary)]/45">
                  Comece a conversa. Fora da janela de 24h use um template.
                </p>
              ) : (
                messages.map((message) => {
                  const outbound = message.direction === "OUTBOUND";
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        outbound ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm",
                          outbound
                            ? "bg-[#DCF8C6] text-[var(--atria-primary)]"
                            : "bg-white text-[var(--atria-primary)]",
                        )}
                      >
                        {message.templateName ? (
                          <p className="mb-1 text-[11px] opacity-60">
                            Template: {message.templateName}
                          </p>
                        ) : null}
                        {message.body ? (
                          <p className="whitespace-pre-wrap">{message.body}</p>
                        ) : null}
                        <p className="mt-1 text-[10px] opacity-45">
                          {formatTime(message.createdAt)}
                          {outbound ? ` · ${message.status}` : ""}
                          {message.sentBy?.name
                            ? ` · ${message.sentBy.name}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={threadEnd} />
            </div>

            <form
              onSubmit={(event) => void handleSend(event)}
              className="flex gap-2 border-t border-[var(--atria-primary)]/10 p-3"
            >
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Escreva uma mensagem..."
                rows={2}
                className="min-h-11 flex-1 resize-none rounded-lg border border-input px-3 py-2 text-sm"
              />
              <Button
                type="submit"
                disabled={sending || !body.trim()}
                className="self-end bg-[#128C7E] text-white hover:bg-[#128C7E]/90"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--atria-primary)]/45">
            Selecione uma conversa.
          </div>
        )}
      </section>
    </div>
  );
}
