"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useWhatsappConversations } from "@/hooks/use-whatsapp";
import { cn } from "@/lib/utils";

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

function initials(phone: string) {
  return phone.slice(-2);
}

export function WhatsappInbox() {
  const router = useRouter();
  const { data: conversations = [], isLoading } = useWhatsappConversations();
  const [query, setQuery] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");

  const filtered = conversations.filter((item) =>
    item.phone.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function openChat(phone: string) {
    router.push(`/chat/${encodeURIComponent(phone)}`);
  }

  function handleCreate() {
    const phone = newPhone.replace(/\D/g, "");
    if (!phone) return;
    setNewOpen(false);
    setNewPhone("");
    openChat(phone);
  }

  return (
    <div className="-m-4 flex h-[calc(100dvh-3.5rem)] overflow-hidden bg-white lg:-m-6 lg:h-[calc(100dvh-4rem)] xl:-m-8">
      <aside className="flex w-full flex-col md:max-w-[420px] md:border-r md:border-black/10">
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
              placeholder="Pesquisar conversa"
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
            filtered.map((conversation) => (
              <button
                key={conversation.phone}
                type="button"
                onClick={() => openChat(conversation.phone)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-black/5 px-4 py-3 text-left hover:bg-[#f5f6f6]",
                )}
              >
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: avatarColor(conversation.phone) }}
                >
                  {initials(conversation.phone)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-[#111b21]">
                      {formatPhone(conversation.phone)}
                    </span>
                    <span className="shrink-0 text-[11px] text-black/40">
                      {formatTime(conversation.lastMessageAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 truncate text-[13px] text-black/50">
                    {conversation.lastMessage}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="hidden flex-1 items-center justify-center bg-[#f8f9fa] md:flex">
        <div className="text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#00a884]/15 text-[#00a884]">
            <MessageCircle className="size-8" />
          </div>
          <h2 className="mt-4 text-xl font-medium text-[#41525d]">
            WhatsApp Web
          </h2>
          <p className="mt-2 max-w-sm text-sm text-black/45">
            Selecione uma conversa à esquerda ou comece uma nova.
          </p>
        </div>
      </div>

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
            <Button
              type="button"
              onClick={handleCreate}
              disabled={!newPhone.trim()}
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
