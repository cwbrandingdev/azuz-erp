"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCheck,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Send,
  StickyNote,
  UserRound,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { WhatsappCallDock } from "@/components/whatsapp/whatsapp-call-dock";
import {
  useWhatsappCannedResponses,
  useWhatsappConversations,
  useWhatsappMutations,
} from "@/hooks/use-whatsapp";
import { useWhatsappVoice } from "@/hooks/use-whatsapp-voice";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { usersService } from "@/services";
import * as whatsappService from "@/services/whatsapp.service";
import type {
  WhatsAppAssigneeFilter,
  WhatsAppConversation,
  WhatsAppInboxPriority,
  WhatsAppInboxStatus,
  WhatsAppMessage,
} from "@/services/whatsapp.service";

const STATUS_OPTIONS: Array<{ id: WhatsAppInboxStatus | "ALL"; label: string }> =
  [
    { id: "OPEN", label: "Abertas" },
    { id: "PENDING", label: "Pendentes" },
    { id: "SNOOZED", label: "Adiadas" },
    { id: "RESOLVED", label: "Resolvidas" },
  ];

const ASSIGNEE_OPTIONS: Array<{ id: WhatsAppAssigneeFilter; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "mine", label: "Minhas" },
  { id: "unassigned", label: "Não atribuídas" },
];

const PRIORITY_LABEL: Record<WhatsAppInboxPriority, string> = {
  NONE: "Nenhuma",
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

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

function displayName(conversation: WhatsAppConversation) {
  return conversation.name?.trim() || formatPhone(conversation.phone);
}

function StatusTicks({ status }: { status: string }) {
  if (status === "FAILED") return <span className="text-red-500">!</span>;
  if (status === "READ") {
    return <CheckCheck className="size-3.5 text-sky-500" />;
  }
  if (status === "DELIVERED") {
    return <CheckCheck className="size-3.5 text-black/40" />;
  }
  return <Check className="size-3.5 text-black/40" />;
}

export function WhatsappInbox({ initialPhone }: { initialPhone?: string }) {
  const { user } = useAuth();
  const { sendMessage, addNote, updateConversation } = useWhatsappMutations();
  const voice = useWhatsappVoice();
  const { data: canned = [] } = useWhatsappCannedResponses();
  const membersQuery = useQuery({
    queryKey: ["whatsapp-members"],
    queryFn: () => usersService.getMembers(),
  });

  const [status, setStatus] = useState<WhatsAppInboxStatus | "ALL">("OPEN");
  const [assignee, setAssignee] = useState<WhatsAppAssigneeFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(
    initialPhone ?? null,
  );
  const [newOpen, setNewOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [labelDraft, setLabelDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading } = useWhatsappConversations({
    status: status === "ALL" ? undefined : status,
    assignee,
    q: query || undefined,
  });

  const selected =
    conversations.find((item) => item.phone === selectedPhone) ?? null;

  useEffect(() => {
    if (initialPhone) setSelectedPhone(initialPhone);
  }, [initialPhone]);

  useEffect(() => {
    setNameDraft(selected?.name ?? "");
  }, [selected?.phone, selected?.name]);

  useEffect(() => {
    if (!selectedPhone) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const history = await whatsappService.getMessages(selectedPhone as string);
        if (!cancelled) setMessages(history);
      } catch {
        if (!cancelled) toast.error("Não foi possível carregar as mensagens.");
      }
    }
    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedPhone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const cannedMatches = useMemo(() => {
    if (!draft.startsWith("/")) return [];
    const needle = draft.slice(1).toLowerCase();
    return canned.filter(
      (item) =>
        item.shortCode.startsWith(needle) ||
        item.title.toLowerCase().includes(needle),
    );
  }, [canned, draft]);

  function openChat(phone: string) {
    setSelectedPhone(phone.replace(/\D/g, ""));
    setNewOpen(false);
    setNewPhone("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedPhone || !draft.trim()) return;
    const text = draft.trim();
    try {
      const created =
        mode === "note"
          ? await addNote.mutateAsync({ phone: selectedPhone, message: text })
          : await sendMessage.mutateAsync({ to: selectedPhone, message: text });
      setMessages((current) => [...current, created]);
      setDraft("");
    } catch {
      return;
    }
  }

  return (
    <div className="-m-4 flex h-[calc(100dvh-3.5rem)] overflow-hidden border border-black/5 bg-white lg:-m-6 lg:h-[calc(100dvh-4rem)] xl:-m-8">
      <WhatsappCallDock
        voice={voice}
        nameFor={(phone) => {
          const conversation = conversations.find((item) => item.phone === phone);
          return conversation ? displayName(conversation) : formatPhone(phone);
        }}
      />
      <aside className="flex w-full max-w-[360px] shrink-0 flex-col border-r border-black/10 bg-[#f8f9fc]">
        <div className="flex items-center justify-between border-b border-black/5 bg-white px-4 py-3">
          <div>
            <h1 className="text-base font-semibold text-slate-800">Conversas</h1>
            <p className="text-xs text-slate-500">Inbox compartilhada</p>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            onClick={() => setNewOpen(true)}
            aria-label="Nova conversa"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-black/5 bg-white px-2 py-2">
          {STATUS_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatus(item.id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                status === item.id
                  ? "bg-[var(--atria-primary)] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 border-b border-black/5 px-2 py-2">
          {ASSIGNEE_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAssignee(item.id)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium",
                assignee === item.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="border-b border-black/5 px-3 py-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar conversas"
              className="h-9 rounded-lg border-slate-200 bg-white pl-9"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              Carregando...
            </p>
          ) : conversations.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              Nenhuma conversa neste filtro.
            </p>
          ) : (
            conversations.map((conversation) => {
              const active = conversation.phone === selectedPhone;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedPhone(conversation.phone)}
                  className={cn(
                    "flex w-full gap-3 border-b border-black/5 px-4 py-3 text-left hover:bg-white",
                    active && "bg-white shadow-[inset_3px_0_0_var(--atria-primary)]",
                  )}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                    {displayName(conversation).slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-800">
                        {displayName(conversation)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatTime(conversation.lastMessageAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] text-slate-500">
                        {conversation.lastMessage || "Sem mensagens"}
                      </span>
                      {conversation.unreadCount > 0 ? (
                        <span className="rounded-full bg-[var(--atria-primary)] px-1.5 text-[10px] font-semibold text-white">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </span>
                    {conversation.labels.length > 0 ? (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {conversation.labels.slice(0, 3).map((label) => (
                          <span
                            key={label}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                          >
                            {label}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-[#f4f6fb]">
        {selectedPhone ? (
          <>
            <header className="flex items-center justify-between gap-3 border-b border-black/5 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {selected ? displayName(selected) : formatPhone(selectedPhone)}
                </p>
                <p className="text-xs text-slate-500">
                  {formatPhone(selectedPhone)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  disabled={
                    voice.busy || Boolean(voice.active) || Boolean(voice.incoming)
                  }
                  onClick={() => void voice.startCall(selectedPhone)}
                  aria-label="Ligar no WhatsApp"
                >
                  <Phone className="size-4" />
                </Button>
                <select
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                  value={selected?.status ?? "OPEN"}
                  onChange={(event) =>
                    void updateConversation.mutateAsync({
                      phone: selectedPhone,
                      status: event.target.value as WhatsAppInboxStatus,
                    })
                  }
                >
                  <option value="OPEN">Aberta</option>
                  <option value="PENDING">Pendente</option>
                  <option value="SNOOZED">Adiada</option>
                  <option value="RESOLVED">Resolvida</option>
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant={selected?.status === "RESOLVED" ? "outline" : "default"}
                  onClick={() =>
                    void updateConversation.mutateAsync({
                      phone: selectedPhone,
                      status:
                        selected?.status === "RESOLVED" ? "OPEN" : "RESOLVED",
                    })
                  }
                >
                  {selected?.status === "RESOLVED" ? "Reabrir" : "Resolver"}
                </Button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-8">
              {messages.map((message) => {
                if (message.isPrivate) {
                  return (
                    <div
                      key={message.id}
                      className="mx-auto mb-2 max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                    >
                      <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                        <StickyNote className="size-3" />
                        Nota privada
                        {message.sentByName ? ` · ${message.sentByName}` : ""}
                      </p>
                      <p className="whitespace-pre-wrap">{message.body}</p>
                    </div>
                  );
                }
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
                        "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                        outbound
                          ? "rounded-br-md bg-[var(--atria-primary)] text-white"
                          : "rounded-bl-md bg-white text-slate-800",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.body}
                      </p>
                      <span
                        className={cn(
                          "mt-1 flex items-center justify-end gap-1 text-[11px]",
                          outbound ? "text-white/70" : "text-slate-400",
                        )}
                      >
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
              className="border-t border-black/5 bg-white px-3 py-2"
              onSubmit={(event) => void handleSubmit(event)}
            >
              <div className="mb-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => setMode("reply")}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium",
                    mode === "reply"
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:bg-slate-100",
                  )}
                >
                  Responder
                </button>
                <button
                  type="button"
                  onClick={() => setMode("note")}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium",
                    mode === "note"
                      ? "bg-amber-600 text-white"
                      : "text-slate-500 hover:bg-slate-100",
                  )}
                >
                  Nota privada
                </button>
              </div>
              {cannedMatches.length > 0 ? (
                <div className="mb-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  {cannedMatches.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDraft(item.content)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <span className="text-xs font-semibold text-slate-700">
                        /{item.shortCode} · {item.title}
                      </span>
                      <span className="truncate text-xs text-slate-500">
                        {item.content}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={2}
                  placeholder={
                    mode === "note"
                      ? "Nota visível só para a equipe..."
                      : "Mensagem. Digite / para respostas prontas"
                  }
                  className="max-h-32 min-h-12 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--atria-primary)]"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={
                    !draft.trim() ||
                    sendMessage.isPending ||
                    addNote.isPending
                  }
                  className="size-10 rounded-full"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <MessageCircle className="size-10 text-slate-300" />
            <h2 className="mt-3 text-lg font-medium text-slate-600">
              Selecione uma conversa
            </h2>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Filtre por status, atribua atendentes e use notas privadas como
              numa inbox compartilhada.
            </p>
          </div>
        )}
      </section>

      {selectedPhone ? (
        <aside className="hidden w-[300px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-black/10 bg-white p-4 xl:flex">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <UserRound className="size-6" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {selected ? displayName(selected) : formatPhone(selectedPhone)}
              </p>
              <p className="text-xs text-slate-500">
                {formatPhone(selectedPhone)}
              </p>
            </div>
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Nome do contato
            <Input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={() => {
                if (nameDraft !== (selected?.name ?? "")) {
                  void updateConversation.mutateAsync({
                    phone: selectedPhone,
                    name: nameDraft,
                  });
                }
              }}
              className="h-8 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Atribuir a
            <select
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
              value={selected?.assignedUser?.id ?? ""}
              onChange={(event) =>
                void updateConversation.mutateAsync({
                  phone: selectedPhone,
                  assignedUserId: event.target.value || null,
                })
              }
            >
              <option value="">Não atribuído</option>
              {(membersQuery.data ?? []).map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                    {member.id === user?.id ? " (eu)" : ""}
                  </option>
                ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Prioridade
            <select
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm"
              value={selected?.priority ?? "NONE"}
              onChange={(event) =>
                void updateConversation.mutateAsync({
                  phone: selectedPhone,
                  priority: event.target.value as WhatsAppInboxPriority,
                })
              }
            >
              {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">Etiquetas</p>
            <div className="mb-2 flex flex-wrap gap-1">
              {(selected?.labels ?? []).map((label) => (
                <button
                  key={label}
                  type="button"
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700"
                  onClick={() =>
                    void updateConversation.mutateAsync({
                      phone: selectedPhone,
                      labels: (selected?.labels ?? []).filter((item) => item !== label),
                    })
                  }
                >
                  {label} ×
                </button>
              ))}
            </div>
            <Input
              value={labelDraft}
              onChange={(event) => setLabelDraft(event.target.value)}
              placeholder="Adicionar e Enter"
              className="h-8 text-sm"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  const next = labelDraft.trim();
                  if (!next || selected?.labels.includes(next)) return;
                  void updateConversation.mutateAsync({
                    phone: selectedPhone,
                    labels: [...(selected?.labels ?? []), next],
                  });
                  setLabelDraft("");
                }
              }}
            />
          </div>

          {selected?.assignedUser ? (
            <p className="text-xs text-slate-500">
              Atendente: {selected.assignedUser.name}
            </p>
          ) : null}
        </aside>
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
              placeholder="5511999999999"
            />
            <Button type="button" onClick={() => openChat(newPhone)} disabled={!newPhone.trim()}>
              Abrir conversa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
