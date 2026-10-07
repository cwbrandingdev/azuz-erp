"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  MessageCircle,
  Plus,
  Search,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useWhatsappConversations,
  useWhatsappMessages,
  useWhatsappMutations,
} from "@/hooks/use-whatsapp";
import { cn } from "@/lib/utils";
import type { WhatsappConversation } from "@/services/whatsapp.service";

function displayName(conversation: WhatsappConversation) {
  return conversation.name?.trim() || formatPhone(conversation.phone ?? conversation.waId);
}

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
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (sameDay) {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function avatarColor(key: string) {
  const palette = [
    "#00a884",
    "#53bdeb",
    "#a855f7",
    "#f59e0b",
    "#ef4444",
    "#06b6d4",
  ];
  let hash = 0;
  for (const char of key) hash = (hash + char.charCodeAt(0)) % palette.length;
  return palette[hash] ?? palette[0];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function WhatsappInbox() {
  const isMobile = useIsMobile();
  const { data: conversations = [], isLoading } = useWhatsappConversations();
  const { createConversation, sendMessage } = useWhatsappMutations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const selected =
    conversations.find((item) => item.id === selectedId) ?? null;
  const { data: messages = [] } = useWhatsappMessages(selectedId);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((item) =>
      `${item.name ?? ""} ${item.phone ?? ""} ${item.waId}`
        .toLowerCase()
        .includes(needle),
    );
  }, [conversations, query]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, selectedId]);

  async function handleCreate() {
    if (!newPhone.trim()) return;
    try {
      const conversation = await createConversation.mutateAsync({
        phone: newPhone.trim(),
        name: newName.trim() || undefined,
      });
      setSelectedId(conversation.id);
      setNewOpen(false);
      setNewPhone("");
      setNewName("");
    } catch {
      // apiRequest already toasts
    }
  }

  async function handleSend() {
    if (!selected || !draft.trim()) return;
    try {
      await sendMessage.mutateAsync({
        to: selected.waId,
        body: draft.trim(),
      });
      setDraft("");
    } catch {
      // apiRequest already toasts
    }
  }

  const showList = !isMobile || !selectedId;
  const showChat = !isMobile || Boolean(selectedId);

  return (
    <div className="-m-4 flex h-[calc(100dvh-3.5rem)] overflow-hidden bg-[#efeae2] lg:-m-6 lg:h-[calc(100dvh-4rem)] xl:-m-8">
      {showList ? (
        <aside className="flex w-full shrink-0 flex-col border-r border-black/10 bg-white md:w-[340px] lg:w-[380px]">
          <div className="flex items-center justify-between bg-[#00a884] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-5" />
              <h1 className="text-base font-semibold">WhatsApp</h1>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-white hover:bg-white/15 hover:text-white"
              onClick={() => setNewOpen(true)}
              aria-label="Nova conversa"
            >
              <Plus className="size-4" />
            </Button>
          </div>

          <div className="border-b border-black/5 bg-[#f0f2f5] px-3 py-2">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/40" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Pesquisar ou começar uma nova conversa"
                className="h-9 rounded-lg border-none bg-white pl-9 shadow-none"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-black/40">
                Carregando conversas...
              </p>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-black/40">
                Nenhuma conversa ainda. Comece uma nova.
              </p>
            ) : (
              filtered.map((conversation) => {
                const active = conversation.id === selectedId;
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-black/5 px-4 py-3 text-left hover:bg-[#f5f6f6]",
                      active && "bg-[#f0f2f5]",
                    )}
                  >
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: avatarColor(conversation.waId) }}
                    >
                      {initials(displayName(conversation))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-[#111b21]">
                          {displayName(conversation)}
                        </span>
                        <span className="shrink-0 text-[11px] text-black/40">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] text-black/50">
                          {conversation.lastMessagePreview || "Sem mensagens"}
                        </span>
                        {conversation.unreadCount > 0 ? (
                          <span className="flex min-w-5 items-center justify-center rounded-full bg-[#00a884] px-1.5 text-[10px] font-semibold text-white">
                            {conversation.unreadCount}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      ) : null}

      {showChat ? (
        <section className="flex min-w-0 flex-1 flex-col">
          {selected ? (
            <>
              <header className="flex items-center gap-3 bg-[#f0f2f5] px-3 py-2.5 shadow-sm">
                {isMobile ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setSelectedId(null)}
                    aria-label="Voltar"
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                ) : null}
                <span
                  className="flex size-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: avatarColor(selected.waId) }}
                >
                  {initials(displayName(selected))}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#111b21]">
                    {displayName(selected)}
                  </p>
                  <p className="truncate text-xs text-black/45">
                    {formatPhone(selected.phone ?? selected.waId)}
                  </p>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto bg-[url('data:image/svg+xml,%3Csvg width=%2760%27 height=%2760%27 viewBox=%270 0 60 60%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27%23000%27 fill-opacity=%270.03%27%3E%3Cpath d=%27M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%27/%3E%3C/g%3E%3C/svg%3E')] px-3 py-4 lg:px-10">
                {messages.map((message) => {
                  const outbound = message.direction === "OUT";
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
                          "max-w-[80%] rounded-lg px-2.5 py-1.5 text-[14.5px] leading-5 shadow-sm",
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
                })}
                <div ref={bottomRef} />
              </div>

              <form
                className="flex items-end gap-2 bg-[#f0f2f5] px-3 py-2.5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSend();
                }}
              >
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="Mensagem"
                  className="max-h-28 min-h-10 flex-1 resize-none rounded-lg border-none bg-white px-3 py-2.5 text-sm outline-none"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={sendMessage.isPending || !draft.trim()}
                  className="size-10 rounded-full bg-[#00a884] text-white hover:bg-[#008f72]"
                >
                  <Send className="size-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center bg-[#f8f9fa] text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-[#00a884]/15 text-[#00a884]">
                <MessageCircle className="size-8" />
              </div>
              <h2 className="mt-4 text-xl font-medium text-[#41525d]">
                WhatsApp Web
              </h2>
              <p className="mt-2 max-w-sm text-sm text-black/45">
                Selecione uma conversa ou comece uma nova para enviar mensagens.
              </p>
            </div>
          )}
        </section>
      ) : null}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova conversa</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              value={newPhone}
              onChange={(event) => setNewPhone(event.target.value)}
              placeholder="Número (5511999999999)"
            />
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Nome (opcional)"
            />
            <Button
              type="button"
              onClick={() => void handleCreate()}
              disabled={createConversation.isPending || !newPhone.trim()}
              className="bg-[#00a884] hover:bg-[#008f72]"
            >
              Abrir conversa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
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
