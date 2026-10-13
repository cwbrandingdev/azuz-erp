"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useWhatsappBotFlows,
  useWhatsappBroadcasts,
  useWhatsappInboxSettings,
  useWhatsappMutations,
  useWhatsappTriggers,
} from "@/hooks/use-whatsapp";
import { LEAD_STATUS_LABELS } from "@/lib/leads-kanban-utils";
import { toast } from "@/lib/toast";
import { leadsService } from "@/services";
import * as whatsappService from "@/services/whatsapp.service";
import type {
  WhatsAppBotDefinition,
  WhatsAppBotNode,
  WhatsAppBotNodeType,
  WhatsAppBroadcastStatus,
  WhatsAppTriggerEvent,
} from "@/services/whatsapp.service";

type Tab = "bot" | "campaigns" | "triggers" | "ai";

const NODE_TYPES: Array<{ id: WhatsAppBotNodeType; label: string }> = [
  { id: "message", label: "Mensagem" },
  { id: "menu", label: "Menu" },
  { id: "question", label: "Pergunta" },
  { id: "ai", label: "IA" },
  { id: "handoff", label: "Transferir" },
];

const BROADCAST_LABEL: Record<WhatsAppBroadcastStatus, string> = {
  DRAFT: "Rascunho",
  SCHEDULED: "Agendada",
  RUNNING: "Enviando",
  PAUSED: "Pausada",
  DONE: "Concluída",
  FAILED: "Falhou",
};

const TRIGGER_LABEL: Record<WhatsAppTriggerEvent, string> = {
  CART_ABANDONED: "Carrinho abandonado",
  APPOINTMENT: "Lembrete de compromisso",
  PIX_BOLETO: "PIX / boleto em aberto",
  POST_SALE: "Pós-venda (etapa do funil)",
};

function emptyNode(type: WhatsAppBotNodeType, index: number): WhatsAppBotNode {
  return {
    id: `step_${Date.now()}_${index}`,
    type,
    text:
      type === "handoff"
        ? "Vou te transferir para um atendente."
        : type === "menu"
          ? "Escolha uma opção:"
          : "",
    field: type === "question" ? "resposta" : undefined,
    options:
      type === "menu"
        ? [
            { key: "1", label: "Opção 1", nextId: null },
            { key: "2", label: "Falar com atendente", nextId: null },
          ]
        : [],
    nextId: null,
  };
}

export function WhatsappAutomationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [tab, setTab] = useState<Tab>("bot");
  const { data: settings } = useWhatsappInboxSettings();
  const { data: flows } = useWhatsappBotFlows();
  const { data: broadcasts } = useWhatsappBroadcasts();
  const { data: triggers } = useWhatsappTriggers();
  const {
    updateSettings,
    saveBotFlow,
    removeBotFlow,
    saveBroadcast,
    startBroadcast,
    pauseBroadcast,
    removeBroadcast,
    saveTrigger,
    removeTrigger,
    fireAbandonedCart,
  } = useWhatsappMutations();
  const stagesQuery = useQuery({
    queryKey: ["whatsapp-stages"],
    queryFn: () => leadsService.listLeadStages(),
  });

  const flow = flows?.[0];
  const [flowName, setFlowName] = useState("Qualificação inicial");
  const [flowEnabled, setFlowEnabled] = useState(true);
  const [definition, setDefinition] = useState<WhatsAppBotDefinition>({
    startId: "",
    nodes: [],
  });

  const [botEnabled, setBotEnabled] = useState(false);
  const [aiAutoReply, setAiAutoReply] = useState(false);

  const [campaignName, setCampaignName] = useState("");
  const [campaignBody, setCampaignBody] = useState("");
  const [matchLabel, setMatchLabel] = useState("");
  const [matchStageId, setMatchStageId] = useState("");
  const [matchSource, setMatchSource] = useState("");
  const [matchLeadStatus, setMatchLeadStatus] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [ratePerMinute, setRatePerMinute] = useState(20);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const [triggerName, setTriggerName] = useState("");
  const [triggerType, setTriggerType] =
    useState<WhatsAppTriggerEvent>("CART_ABANDONED");
  const [triggerDelay, setTriggerDelay] = useState(0);
  const [triggerBody, setTriggerBody] = useState("");
  const [triggerStageId, setTriggerStageId] = useState("");
  const [cartPhone, setCartPhone] = useState("");

  useEffect(() => {
    if (!flow) return;
    setFlowName(flow.name);
    setFlowEnabled(flow.enabled);
    setDefinition({
      startId: flow.definition?.startId || flow.definition?.nodes?.[0]?.id || "",
      nodes: flow.definition?.nodes ?? [],
    });
  }, [flow]);

  useEffect(() => {
    if (!settings) return;
    setBotEnabled(Boolean(settings.botEnabled));
    setAiAutoReply(Boolean(settings.aiAutoReply));
  }, [settings]);

  const nodeIds = useMemo(
    () => definition.nodes.map((node) => node.id),
    [definition.nodes],
  );

  function updateNode(id: string, patch: Partial<WhatsAppBotNode>) {
    setDefinition((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === id ? { ...node, ...patch } : node,
      ),
    }));
  }

  async function handleSaveFlow() {
    try {
      await saveBotFlow.mutateAsync({
        id: flow?.id,
        name: flowName,
        enabled: flowEnabled,
        definition: {
          startId: definition.startId || definition.nodes[0]?.id || "",
          nodes: definition.nodes,
        },
      });
      toast.success("Fluxo salvo.");
    } catch {
      toast.error("Não foi possível salvar o fluxo.");
    }
  }

  async function handleSaveAi() {
    try {
      await updateSettings.mutateAsync({ botEnabled, aiAutoReply });
      toast.success("Configuração de IA salva.");
    } catch {
      toast.error("Não foi possível salvar a IA.");
    }
  }

  async function handlePreview() {
    try {
      const result = await whatsappService.previewBroadcast({
        matchLabel: matchLabel || null,
        matchStageId: matchStageId || null,
        matchSource: matchSource || null,
        matchLeadStatus: matchLeadStatus || null,
      });
      setPreviewCount(result.count);
    } catch {
      toast.error("Não foi possível estimar o segmento.");
    }
  }

  async function handleCreateCampaign() {
    try {
      await saveBroadcast.mutateAsync({
        name: campaignName || "Campanha",
        body: campaignBody,
        matchLabel: matchLabel || null,
        matchStageId: matchStageId || null,
        matchSource: matchSource || null,
        matchLeadStatus: matchLeadStatus || null,
        scheduledAt: scheduledAt
          ? new Date(scheduledAt).toISOString()
          : null,
        ratePerMinute,
      });
      setCampaignName("");
      setCampaignBody("");
      toast.success("Campanha criada.");
    } catch {
      toast.error("Não foi possível criar a campanha.");
    }
  }

  async function handleCreateTrigger() {
    try {
      await saveTrigger.mutateAsync({
        name: triggerName || TRIGGER_LABEL[triggerType],
        eventType: triggerType,
        delayMinutes: triggerDelay,
        body: triggerBody,
        matchStageId: triggerStageId || null,
        enabled: true,
      });
      setTriggerName("");
      setTriggerBody("");
      toast.success("Gatilho criado.");
    } catch {
      toast.error("Não foi possível criar o gatilho.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Automação WhatsApp</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
          {(
            [
              ["bot", "Chatbot"],
              ["campaigns", "Campanhas"],
              ["triggers", "Gatilhos"],
              ["ai", "IA"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 rounded-md px-2 py-1.5 font-medium ${
                tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "bot" ? (
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-xs text-slate-500">
              O bot responde conversas não atribuídas. Menu, pergunta e IA
              qualificam; o passo Transferir passa para um atendente.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={flowName}
                onChange={(event) => setFlowName(event.target.value)}
                placeholder="Nome do fluxo"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={flowEnabled}
                  onChange={(event) => setFlowEnabled(event.target.checked)}
                />
                Fluxo ativo
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              Passo inicial
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                value={definition.startId}
                onChange={(event) =>
                  setDefinition((current) => ({
                    ...current,
                    startId: event.target.value,
                  }))
                }
              >
                {definition.nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.id}
                  </option>
                ))}
              </select>
            </label>
            {definition.nodes.map((node, index) => (
              <div
                key={node.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    {index + 1}. {node.id}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={() =>
                      setDefinition((current) => ({
                        ...current,
                        nodes: current.nodes.filter((item) => item.id !== node.id),
                      }))
                    }
                  >
                    Remover
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                    value={node.type}
                    onChange={(event) =>
                      updateNode(node.id, {
                        type: event.target.value as WhatsAppBotNodeType,
                      })
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
                      updateNode(node.id, { nextId: event.target.value || null })
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
                  onChange={(event) =>
                    updateNode(node.id, { text: event.target.value })
                  }
                />
                {node.type === "question" ? (
                  <Input
                    className="mt-2 h-8 text-xs"
                    placeholder="Campo coletado (ex: nome)"
                    value={node.field ?? ""}
                    onChange={(event) =>
                      updateNode(node.id, { field: event.target.value })
                    }
                  />
                ) : null}
                {node.type === "menu"
                  ? (node.options ?? []).map((option, optionIndex) => (
                      <div key={optionIndex} className="mt-2 grid grid-cols-3 gap-1">
                        <Input
                          className="h-8 text-xs"
                          value={option.key}
                          onChange={(event) => {
                            const options = [...(node.options ?? [])];
                            options[optionIndex] = {
                              ...option,
                              key: event.target.value,
                            };
                            updateNode(node.id, { options });
                          }}
                        />
                        <Input
                          className="h-8 text-xs"
                          value={option.label}
                          onChange={(event) => {
                            const options = [...(node.options ?? [])];
                            options[optionIndex] = {
                              ...option,
                              label: event.target.value,
                            };
                            updateNode(node.id, { options });
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
                            updateNode(node.id, { options });
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
                    ))
                  : null}
                {node.type === "menu" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() =>
                      updateNode(node.id, {
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
                ) : null}
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {NODE_TYPES.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDefinition((current) => {
                      const node = emptyNode(item.id, current.nodes.length);
                      return {
                        startId: current.startId || node.id,
                        nodes: [...current.nodes, node],
                      };
                    })
                  }
                >
                  + {item.label}
                </Button>
              ))}
            </div>
            <div className="flex justify-between">
              {flow ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => removeBotFlow.mutate(flow.id)}
                >
                  Excluir fluxo
                </Button>
              ) : (
                <span />
              )}
              <Button type="button" onClick={() => void handleSaveFlow()}>
                Salvar fluxo
              </Button>
            </div>
          </div>
        ) : null}

        {tab === "campaigns" ? (
          <div className="flex flex-col gap-3 text-sm">
            <Input
              placeholder="Nome da campanha"
              value={campaignName}
              onChange={(event) => setCampaignName(event.target.value)}
            />
            <textarea
              className="min-h-20 w-full rounded-md border border-slate-200 p-2 text-sm"
              placeholder="Mensagem. Variáveis: {{primeiro_nome}} {{nome}}"
              value={campaignBody}
              onChange={(event) => setCampaignBody(event.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Etiqueta"
                value={matchLabel}
                onChange={(event) => setMatchLabel(event.target.value)}
              />
              <Input
                placeholder="Origem do lead"
                value={matchSource}
                onChange={(event) => setMatchSource(event.target.value)}
              />
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                value={matchStageId}
                onChange={(event) => setMatchStageId(event.target.value)}
              >
                <option value="">Qualquer etapa</option>
                {(stagesQuery.data ?? []).map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                value={matchLeadStatus}
                onChange={(event) => setMatchLeadStatus(event.target.value)}
              >
                <option value="">Qualquer status</option>
                {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
              <Input
                type="number"
                min={1}
                max={60}
                value={ratePerMinute}
                onChange={(event) =>
                  setRatePerMinute(Number(event.target.value) || 20)
                }
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <button type="button" className="underline" onClick={() => void handlePreview()}>
                Estimar alcance
                {previewCount != null ? `: ${previewCount} contato(s)` : ""}
              </button>
              <span>Limite: {ratePerMinute}/min</span>
            </div>
            <Button type="button" onClick={() => void handleCreateCampaign()}>
              Criar campanha
            </Button>
            <div className="flex flex-col gap-2">
              {(broadcasts ?? []).map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-slate-500">
                        {BROADCAST_LABEL[item.status]} · enviados {item.sentCount} ·
                        entregues {item.deliveredCount} · lidos {item.readCount} ·
                        respostas {item.repliedCount} · falhas {item.failedCount}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {item.status === "DRAFT" ||
                      item.status === "SCHEDULED" ||
                      item.status === "PAUSED" ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => startBroadcast.mutate(item.id)}
                        >
                          {item.status === "PAUSED" ? "Retomar" : "Disparar"}
                        </Button>
                      ) : null}
                      {item.status === "RUNNING" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => pauseBroadcast.mutate(item.id)}
                        >
                          Pausar
                        </Button>
                      ) : null}
                      {item.status !== "RUNNING" && item.status !== "SCHEDULED" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => removeBroadcast.mutate(item.id)}
                        >
                          Excluir
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "triggers" ? (
          <div className="flex flex-col gap-3 text-sm">
            <Input
              placeholder="Nome do gatilho"
              value={triggerName}
              onChange={(event) => setTriggerName(event.target.value)}
            />
            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
              value={triggerType}
              onChange={(event) =>
                setTriggerType(event.target.value as WhatsAppTriggerEvent)
              }
            >
              {Object.entries(TRIGGER_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min={0}
              value={triggerDelay}
              onChange={(event) =>
                setTriggerDelay(Number(event.target.value) || 0)
              }
              placeholder="Atraso em minutos"
            />
            {triggerType === "POST_SALE" ? (
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                value={triggerStageId}
                onChange={(event) => setTriggerStageId(event.target.value)}
              >
                <option value="">Qualquer etapa</option>
                {(stagesQuery.data ?? []).map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            ) : null}
            <textarea
              className="min-h-16 w-full rounded-md border border-slate-200 p-2 text-sm"
              placeholder="Mensagem do gatilho"
              value={triggerBody}
              onChange={(event) => setTriggerBody(event.target.value)}
            />
            <p className="text-xs text-slate-400">
              Compromisso: minutos antes do evento. PIX/boleto: minutos após o
              vencimento. Carrinho: dispare pela API ou pelo teste abaixo.
            </p>
            <Button type="button" onClick={() => void handleCreateTrigger()}>
              Criar gatilho
            </Button>
            <div className="flex gap-2">
              <Input
                placeholder="Telefone para testar carrinho"
                value={cartPhone}
                onChange={(event) => setCartPhone(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!cartPhone.trim()) return;
                  fireAbandonedCart.mutate(
                    { phone: cartPhone },
                    {
                      onSuccess: (result) =>
                        toast.success(
                          `Carrinho: ${result.sent} envio(s) em ${result.matched} gatilho(s).`,
                        ),
                      onError: () => toast.error("Falha ao disparar carrinho."),
                    },
                  );
                }}
              >
                Testar
              </Button>
            </div>
            {(triggers ?? []).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {TRIGGER_LABEL[item.eventType]} · {item.delayMinutes} min ·{" "}
                    {item.enabled ? "ativo" : "pausado"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      saveTrigger.mutate({ id: item.id, enabled: !item.enabled })
                    }
                  >
                    {item.enabled ? "Pausar" : "Ativar"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => removeTrigger.mutate(item.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "ai" ? (
          <div className="flex flex-col gap-3 text-sm">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={botEnabled}
                onChange={(event) => setBotEnabled(event.target.checked)}
              />
              <span>
                <strong>Chatbot de qualificação</strong>
                <span className="block text-xs text-slate-500">
                  Responde automaticamente conversas sem atendente e transfere no
                  passo de handoff.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={aiAutoReply}
                onChange={(event) => setAiAutoReply(event.target.checked)}
              />
              <span>
                <strong>Resposta LLM + score preditivo</strong>
                <span className="block text-xs text-slate-500">
                  Se o bot não pegar a conversa, a IA responde e atualiza o score
                  do lead.
                </span>
              </span>
            </label>
            <Button type="button" onClick={() => void handleSaveAi()}>
              Salvar IA
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
