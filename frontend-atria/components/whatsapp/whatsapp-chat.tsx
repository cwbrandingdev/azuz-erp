"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCheck, Send } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import * as whatsappService from "@/services/whatsapp.service";
import type { WhatsAppMessage } from "@/services/whatsapp.service";

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    const rest = digits.slice(2);
    const ddd = rest.slice(0, 2);
    const number = rest.slice(2);
    const split = number.length === 9 ? 5 : 4;
    return `+55 ${ddd} ${number.slice(0, split)}-${number.slice(split)}`;
  }
  return phone;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusTicks({ status }: { status: string }) {
  if (status === "FAILED") {
    return <span className="text-red-500">!</span>;
  }
  if (status === "READ") {
    return <CheckCheck className="size-3.5 text-[#53bdeb]" />;
  }
  if (status === "DELIVERED") {
    return <CheckCheck className="size-3.5 text-black/45" />;
  }
  return <Check className="size-3.5 text-black/45" />;
}

export function WhatsappChat({ phone }: { phone: string }) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    const history = await whatsappService.getMessages(phone);
    setMessages(history);
  }, [phone]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const history = await whatsappService.getMessages(phone);
        if (!cancelled) {
          setMessages(history);
        }
      } catch {
        if (!cancelled) {
          toast.error("Não foi possível carregar as mensagens.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    const interval = window.setInterval(() => {
      void loadMessages().catch(() => undefined);
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [phone, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const created = await whatsappService.sendMessage({
        to: phone,
        message: text,
      });
      setMessages((current) => [...current, created]);
      setDraft("");
    } catch {
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="-m-4 flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-[#efeae2] lg:-m-6 lg:h-[calc(100dvh-4rem)] xl:-m-8">
      <header className="flex items-center gap-3 bg-[#00a884] px-3 py-2.5 text-white shadow-sm">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="text-white hover:bg-white/15 hover:text-white"
          render={<Link href="/whatsapp" />}
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{formatPhone(phone)}</p>
          <p className="truncate text-xs text-white/80">{phone}</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 lg:px-10">
        {loading ? (
          <p className="py-10 text-center text-sm text-black/40">
            Carregando conversa...
          </p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-black/40">
            Nenhuma mensagem ainda.
          </p>
        ) : (
          messages.map((message) => {
            const outbound = message.direction === "OUTBOUND";
            return (
              <div
                key={message.id}
                className={cn(
                  "mb-1.5 flex",
                  outbound ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-2.5 py-1.5 text-sm leading-5 shadow-sm",
                    outbound
                      ? "rounded-tr-none bg-[#d9fdd3] text-[#111b21]"
                      : "rounded-tl-none bg-white text-[#111b21]",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {message.body}
                  </p>
                  <span className="mt-1 flex items-center justify-end gap-1 text-[11px] text-black/45">
                    {formatTime(message.createdAt)}
                    {outbound ? <StatusTicks status={message.status} /> : null}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-end gap-2 bg-[#f0f2f5] px-3 py-2.5"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          rows={1}
          placeholder="Mensagem"
          className="max-h-28 min-h-10 flex-1 resize-none rounded-lg border-none bg-white px-3 py-2.5 text-sm outline-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={sending || !draft.trim()}
          className="size-10 rounded-full bg-[#00a884] text-white hover:bg-[#008f72]"
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
