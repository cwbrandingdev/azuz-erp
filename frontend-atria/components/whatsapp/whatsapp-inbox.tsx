"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightLeft,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  LayoutTemplate,
  MapPin,
  MessageCircle,
  Paperclip,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  Send,
  Settings2,
  StickyNote,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { WhatsappCannedManager } from "@/components/whatsapp/whatsapp-canned-manager";
import { WhatsappCrmPanel } from "@/components/whatsapp/whatsapp-crm-panel";
import {
  WhatsappAutomationDialog,
  type WhatsappAutomationTab,
} from "@/components/whatsapp/whatsapp-automation-dialog";
import { WhatsappCopilotBar } from "@/components/whatsapp/whatsapp-copilot-bar";
import {
  activeMentionQuery,
  insertMention,
  mentionTokenFor,
} from "@/components/whatsapp/whatsapp-mention";
import { WhatsappRoutingSettings } from "@/components/whatsapp/whatsapp-routing-settings";
import { WhatsappTransferDialog } from "@/components/whatsapp/whatsapp-transfer-dialog";
import { WhatsappTemplateDialog } from "@/components/whatsapp/whatsapp-template-dialog";
import {
  useWhatsappCannedResponses,
  useWhatsappConversations,
  useWhatsappInboxCounts,
  useWhatsappMutations,
} from "@/hooks/use-whatsapp";
import { LEAD_STATUS_LABELS } from "@/lib/leads-kanban-utils";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import * as whatsappService from "@/services/whatsapp.service";
import { leadsService, usersService } from "@/services";
import type {
  WhatsAppConversation,
  WhatsAppInboxCounts,
  WhatsAppInboxPriority,
  WhatsAppInboxStatus,
  WhatsAppInboxTab,
  WhatsAppMessage,
} from "@/services/whatsapp.service";
import { whatsappMediaSrc } from "@/services/whatsapp.service";

const TABS: Array<{
  id: WhatsAppInboxTab;
  label: string;
  countKey: keyof WhatsAppInboxCounts;
}> = [
  { id: "OPEN", label: "Abertas", countKey: "open" },
  { id: "MINE", label: "Minhas", countKey: "mine" },
  { id: "UNASSIGNED", label: "Não atribuídas", countKey: "unassigned" },
  { id: "WAITING", label: "Aguardando cliente", countKey: "waiting" },
  { id: "CLOSED", label: "Finalizadas", countKey: "closed" },
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

function formatWait(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}min`;
}

function MessageBody({
  message,
  outbound,
}: {
  message: WhatsAppMessage;
  outbound: boolean;
}) {
  const media = whatsappMediaSrc(message.mediaUrl);
  const maps =
    message.latitude != null && message.longitude != null
      ? `https://www.google.com/maps?q=${message.latitude},${message.longitude}`
      : null;

  return (
    <>
      {message.isViewOnce ? (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">
          Visualização única
        </p>
      ) : null}
      {message.kind === "IMAGE" || message.kind === "STICKER" ? (
        media ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media}
            alt={message.body}
            className="mb-1 max-h-64 rounded-lg object-contain"
          />
        ) : (
          <p>Imagem indisponível</p>
        )
      ) : null}
      {message.kind === "VIDEO" && media ? (
        <video src={media} controls className="mb-1 max-h-64 rounded-lg" />
      ) : null}
      {message.kind === "AUDIO" && media ? (
        <audio src={media} controls className="mb-1 w-full" />
      ) : null}
      {message.kind === "DOCUMENT" && media ? (
        <a
          href={media}
          target="_blank"
          rel="noreferrer"
          className="mb-1 flex items-center gap-1 underline"
        >
          <FileText className="size-3.5" />
          {message.mediaFilename || "Documento"}
        </a>
      ) : null}
      {maps ? (
        <a
          href={maps}
          target="_blank"
          rel="noreferrer"
          className="mb-1 inline-flex items-center gap-1 underline"
        >
          <MapPin className="size-3.5" />
          {message.locationName || message.body}
        </a>
      ) : null}
      {message.kind === "TEMPLATE" ? (
        <p className="mb-1 text-[11px] opacity-80">
          Template {message.templateName}
        </p>
      ) : null}
      {message.body &&
      message.kind !== "LOCATION" &&
      message.kind !== "AUDIO" &&
      message.kind !== "STICKER" ? (
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
      ) : null}
      {message.transcription ? (
        <p
          className={cn(
            "mt-1 text-[11px] italic",
            outbound ? "text-white/80" : "text-slate-500",
          )}
        >
          Transcrição: {message.transcription}
        </p>
      ) : null}
    </>
  );
}

function NoteBody({ body }: { body: string }) {
  const parts = body.split(/(@[\p{L}\p{N}._-]+)/u);
  return (
    <p className="whitespace-pre-wrap">
      {parts.map((part, index) =>
        part.startsWith("@") ? (
          <span key={index} className="font-semibold text-amber-800">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </p>
  );
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
  const {
    sendMessage,
    sendMedia,
    sendLocation,
    sendTemplate,
    sendCanned,
    addNote,
    updateConversation,
  } = useWhatsappMutations();
  const { data: canned = [] } = useWhatsappCannedResponses();
  const { data: counts } = useWhatsappInboxCounts();
  const membersQuery = useQuery({
    queryKey: ["whatsapp-members"],
    queryFn: () => usersService.getMembers(),
  });
  const stagesQuery = useQuery({
    queryKey: ["whatsapp-stages"],
    queryFn: () => leadsService.listLeadStages(),
  });

  const [tab, setTab] = useState<WhatsAppInboxTab>("OPEN");
  const [query, setQuery] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [labelFilter, setLabelFilter] = useState("");
  const [stageId, setStageId] = useState("");
  const [source, setSource] = useState("");
  const [leadStatus, setLeadStatus] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [automationOpen, setAutomationOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
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
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [cannedOpen, setCannedOpen] = useState(false);
  const [automationInitialTab, setAutomationInitialTab] =
    useState<WhatsappAutomationTab>("bot");
  const [detailPanelOpen, setDetailPanelOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading } = useWhatsappConversations({
    tab,
    q: query || undefined,
    operatorId: operatorId || undefined,
    label: labelFilter || undefined,
    stageId: stageId || undefined,
    source: source || undefined,
    leadStatus: leadStatus || undefined,
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
        const history = await whatsappService.getMessages(
          selectedPhone as string,
        );
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

  const mentionQuery = mode === "note" ? activeMentionQuery(draft) : null;
  const mentionMatches = useMemo(() => {
    if (mentionQuery == null) return [];
    const needle = mentionQuery.toLowerCase();
    return (membersQuery.data ?? [])
      .filter((member) => member.name.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [mentionQuery, membersQuery.data]);

  function openChat(phone: string) {
    setSelectedPhone(phone.replace(/\D/g, ""));
    setNewOpen(false);
    setNewPhone("");
    setDetailPanelOpen(true);
  }

  function openAutomation(tab: WhatsappAutomationTab) {
    setAutomationInitialTab(tab);
    setAutomationOpen(true);
  }

  async function copyPhoneToClipboard() {
    if (!selectedPhone) return;
    try {
      await navigator.clipboard.writeText(selectedPhone);
      toast.success("Número copiado.");
    } catch {
      toast.error("Não foi possível copiar o número.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedPhone) return;
    const text = draft.trim();
    if (mode === "note") {
      if (!text) return;
      try {
        const created = await addNote.mutateAsync({
          phone: selectedPhone,
          message: text,
        });
        setMessages((current) => [...current, created]);
        setDraft("");
      } catch {
        return;
      }
      return;
    }
    if (!attachFile && !text) return;
    try {
      const created = attachFile
        ? await sendMedia.mutateAsync({
            to: selectedPhone,
            file: attachFile,
            caption: text || undefined,
          })
        : await sendMessage.mutateAsync({ to: selectedPhone, message: text });
      setMessages((current) => [...current, created]);
      setDraft("");
      setAttachFile(null);
    } catch {
      return;
    }
  }

  async function handleSendLocation() {
    if (!selectedPhone || !navigator.geolocation) {
      toast.error("Localização não disponível neste navegador.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const created = await sendLocation.mutateAsync({
            to: selectedPhone,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setMessages((current) => [...current, created]);
        } catch {
          toast.error("Não foi possível enviar a localização.");
        }
      },
      () => toast.error("Permissão de localização negada."),
    );
  }

  return (
    <div className="-m-4 flex h-[calc(100dvh-3.5rem)] overflow-hidden border border-black/5 bg-white lg:-m-6 lg:h-[calc(100dvh-4rem)] xl:-m-8">
      <aside className="flex w-full max-w-[360px] shrink-0 flex-col border-r border-black/10 bg-[#f8f9fc]">
        <div className="flex items-center justify-between gap-2 border-b border-black/5 bg-white px-3 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    aria-label="Configurações do WhatsApp"
                  />
                }
              >
                <Settings2 className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Configurações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openAutomation("campaigns")}>
                  Campanhas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openAutomation("bot")}>
                  Fluxograma do bot
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openAutomation("triggers")}>
                  Gatilhos automáticos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCannedOpen(true)}>
                  Respostas prontas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  Atribuição, SLA e funil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openAutomation("ai")}>
                  Bot e respostas com IA
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-slate-800">
                Conversas
              </h1>
              <p className="text-xs text-slate-500">Inbox compartilhada</p>
            </div>
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
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                tab === item.id
                  ? "bg-[var(--atria-primary)] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {item.label}
              {counts ? ` ${counts[item.countKey]}` : ""}
            </button>
          ))}
        </div>

        {counts && counts.slaBreached > 0 ? (
          <div className="border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800">
            {counts.slaBreached} conversa(s) acima do SLA de primeira resposta
          </div>
        ) : null}

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
          <div className="mt-2 grid grid-cols-2 gap-1">
            <select
              className="h-7 rounded-md border border-slate-200 bg-white px-1 text-[11px]"
              value={operatorId}
              onChange={(event) => setOperatorId(event.target.value)}
            >
              <option value="">Operador</option>
              {(membersQuery.data ?? []).map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <Input
              value={labelFilter}
              onChange={(event) => setLabelFilter(event.target.value)}
              placeholder="Etiqueta"
              className="h-7 text-[11px]"
            />
            <select
              className="h-7 rounded-md border border-slate-200 bg-white px-1 text-[11px]"
              value={stageId}
              onChange={(event) => setStageId(event.target.value)}
            >
              <option value="">Funil</option>
              {(stagesQuery.data ?? []).map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
            <select
              className="h-7 rounded-md border border-slate-200 bg-white px-1 text-[11px]"
              value={leadStatus}
              onChange={(event) => setLeadStatus(event.target.value)}
            >
              <option value="">Status do lead</option>
              {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Input
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="Origem da campanha"
              className="col-span-2 h-7 text-[11px]"
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
                    active &&
                      "bg-white shadow-[inset_3px_0_0_var(--atria-primary)]",
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
                    {conversation.needsAgentReply ? (
                      <span
                        className={cn(
                          "mt-1 inline-flex items-center gap-1 text-[10px] font-medium",
                          conversation.slaBreached
                            ? "text-red-600"
                            : "text-amber-600",
                        )}
                      >
                        <Clock className="size-3" />
                        {formatWait(conversation.waitingSeconds)}
                        {conversation.slaBreached ? " · SLA" : ""}
                      </span>
                    ) : null}
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
                  {selected
                    ? displayName(selected)
                    : formatPhone(selectedPhone)}
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
                  aria-label={
                    detailPanelOpen
                      ? "Recolher painel do cliente"
                      : "Abrir painel do cliente"
                  }
                  onClick={() => setDetailPanelOpen((open) => !open)}
                >
                  {detailPanelOpen ? (
                    <PanelRightClose className="size-4" />
                  ) : (
                    <PanelRightOpen className="size-4" />
                  )}
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
                  <option value="PENDING">Aguardando cliente</option>
                  <option value="SNOOZED">Adiada</option>
                  <option value="RESOLVED">Finalizada</option>
                </select>
                <Button
                  className="bg-red-700 text-[18px]"
                  type="button"
                  size="sm"
                  variant={
                    selected?.status === "RESOLVED" ? "outline" : "default"
                  }
                  onClick={() =>
                    void updateConversation.mutateAsync({
                      phone: selectedPhone,
                      status:
                        selected?.status === "RESOLVED" ? "OPEN" : "RESOLVED",
                    })
                  }
                >
                  {selected?.status === "RESOLVED" ? "Reabrir" : "Finalizar"}
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
                      <NoteBody body={message.body} />
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
                      <MessageBody message={message} outbound={outbound} />
                      <span
                        className={cn(
                          "mt-1 flex items-center justify-end gap-1 text-[11px]",
                          outbound ? "text-white/70" : "text-slate-400",
                        )}
                      >
                        {formatTime(message.createdAt)}
                        {outbound ? (
                          <StatusTicks status={message.status} />
                        ) : null}
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
              {selectedPhone ? (
                <WhatsappCopilotBar
                  phone={selectedPhone}
                  draft={draft}
                  onUse={setDraft}
                />
              ) : null}
              {cannedMatches.length > 0 ? (
                <div className="mb-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  {cannedMatches.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.mediaUrl && selectedPhone) {
                          void sendCanned
                            .mutateAsync({
                              to: selectedPhone,
                              cannedId: item.id,
                            })
                            .then((created) => {
                              setMessages((current) => [...current, created]);
                              setDraft("");
                            });
                          return;
                        }
                        setDraft(item.content);
                      }}
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
              {attachFile ? (
                <div className="mb-2 flex items-center justify-between rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">
                  <span className="truncate">{attachFile.name}</span>
                  <button type="button" onClick={() => setAttachFile(null)}>
                    ×
                  </button>
                </div>
              ) : null}
              <div className="mb-2 flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={(event) => {
                    setAttachFile(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Anexar arquivo"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Enviar localização"
                  onClick={() => void handleSendLocation()}
                >
                  <MapPin className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Template HSM"
                  onClick={() => setTemplateOpen(true)}
                >
                  <LayoutTemplate className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Respostas prontas"
                  onClick={() => setCannedOpen(true)}
                >
                  <FileText className="size-4" />
                </Button>
              </div>
              {mentionMatches.length > 0 ? (
                <div className="mb-2 overflow-hidden rounded-lg border border-amber-200 bg-white shadow-sm">
                  {mentionMatches.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className="flex w-full px-3 py-1.5 text-left text-sm hover:bg-amber-50"
                      onClick={() => {
                        const token = mentionTokenFor(
                          member.name,
                          (membersQuery.data ?? []).map((item) => item.name),
                        );
                        setDraft((current) => insertMention(current, token));
                      }}
                    >
                      @{member.name}
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
                      ? "Nota visível só para a equipe. Use @ para mencionar"
                      : "Mensagem. Digite / para respostas prontas"
                  }
                  className="max-h-32 min-h-12 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--atria-primary)]"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={
                    (!draft.trim() && !attachFile) ||
                    sendMessage.isPending ||
                    sendMedia.isPending ||
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

      {selectedPhone && detailPanelOpen ? (
        <aside className="flex w-[min(300px,42vw)] shrink-0 flex-col border-l border-black/10 bg-white">
          <div className="flex items-start justify-between gap-2 border-b border-black/5 px-3 py-3">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="shrink-0 text-slate-500"
              aria-label="Recolher painel"
              onClick={() => setDetailPanelOpen(false)}
            >
              <ChevronRight className="size-4" />
            </Button>
            <div className="min-w-0 flex-1 text-right">
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
                placeholder="Nome do cliente"
                className="h-8 border-transparent bg-transparent px-1 text-right text-sm font-semibold text-slate-800 shadow-none hover:border-slate-200 focus-visible:border-slate-300"
              />
              <button
                type="button"
                onClick={() => void copyPhoneToClipboard()}
                title="Clique para copiar o número"
                className="mt-0.5 w-full truncate text-right text-xs text-slate-500 hover:text-slate-800"
              >
                {formatPhone(selectedPhone)}
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-slate-500">Atendente</p>
            <p className="text-sm text-slate-800">
              {selected?.assignedUser?.name ?? "Não atribuído"}
              {selected?.assignedUser?.id === user?.id ? " (você)" : ""}
            </p>
            <div className="flex gap-2">
              {selected?.assignedUser?.id !== user?.id ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void updateConversation.mutateAsync({
                      phone: selectedPhone,
                      assignedUserId: user?.id ?? null,
                    })
                  }
                >
                  Assumir
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setTransferOpen(true)}
              >
                <ArrowRightLeft className="mr-1 size-3.5" />
                Transferir
              </Button>
            </div>
          </div>

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
                      labels: (selected?.labels ?? []).filter(
                        (item) => item !== label,
                      ),
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
          {selected?.needsAgentReply ? (
            <p
              className={cn(
                "text-xs font-medium",
                selected.slaBreached ? "text-red-600" : "text-amber-700",
              )}
            >
              Espera: {formatWait(selected.waitingSeconds)}
              {selected.slaBreached ? " — fora do SLA" : ""}
            </p>
          ) : null}
          <WhatsappCrmPanel phone={selectedPhone} />
          </div>
        </aside>
      ) : null}

      {selectedPhone && !detailPanelOpen ? (
        <button
          type="button"
          className="flex w-9 shrink-0 flex-col items-center justify-center gap-1 border-l border-black/10 bg-white text-slate-500 hover:bg-slate-50"
          aria-label="Abrir painel do cliente"
          onClick={() => setDetailPanelOpen(true)}
        >
          <ChevronLeft className="size-4" />
        </button>
      ) : null}

      <WhatsappAutomationDialog
        open={automationOpen}
        onOpenChange={setAutomationOpen}
        initialTab={automationInitialTab}
      />
      {selectedPhone ? (
        <WhatsappTransferDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          phone={selectedPhone}
          onTransferred={(note) => setMessages((current) => [...current, note])}
        />
      ) : null}
      <WhatsappRoutingSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      <WhatsappCannedManager open={cannedOpen} onOpenChange={setCannedOpen} />
      <WhatsappTemplateDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        sending={sendTemplate.isPending}
        onSend={async (input) => {
          if (!selectedPhone) return;
          const created = await sendTemplate.mutateAsync({
            to: selectedPhone,
            ...input,
          });
          setMessages((current) => [...current, created]);
        }}
      />

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
            <Button
              type="button"
              onClick={() => openChat(newPhone)}
              disabled={!newPhone.trim()}
            >
              Abrir conversa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
