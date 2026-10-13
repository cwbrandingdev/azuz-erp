"use client";

import { useEffect, useState } from "react";
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
  useWhatsappInboxSettings,
  useWhatsappMutations,
  useWhatsappRoutingRules,
  useWhatsappStageMessages,
} from "@/hooks/use-whatsapp";
import { toast } from "@/lib/toast";
import { leadsService, userGroupsService, usersService } from "@/services";
import type {
  WhatsAppRoutingMode,
  WhatsAppRoutingRule,
  WhatsAppStageMessage,
} from "@/services/whatsapp.service";

const MODE_OPTIONS: Array<{ id: WhatsAppRoutingMode; label: string; hint: string }> =
  [
    { id: "MANUAL", label: "Manual", hint: "Fila fica sem dono até alguém atribuir" },
    { id: "ROUND_ROBIN", label: "Round-robin", hint: "Distribui em fila circular" },
    { id: "WORKLOAD", label: "Carga de trabalho", hint: "Quem tiver menos conversas abertas" },
    {
      id: "SPECIALTY",
      label: "Especialidade",
      hint: "Regras por etiqueta, funil ou origem",
    },
  ];

const emptyRule = (): WhatsAppRoutingRule => ({
  matchLabel: "",
  matchStageId: "",
  matchSource: "",
  targetUserGroupId: "",
  targetUserId: "",
  priority: 0,
});

export function WhatsappRoutingSettings({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: settings } = useWhatsappInboxSettings();
  const { data: rules } = useWhatsappRoutingRules();
  const { data: stageMessages } = useWhatsappStageMessages();
  const { updateSettings, saveRules, saveStageMessages } = useWhatsappMutations();
  const membersQuery = useQuery({
    queryKey: ["whatsapp-members"],
    queryFn: () => usersService.getMembers(),
  });
  const groupsQuery = useQuery({
    queryKey: ["whatsapp-groups"],
    queryFn: () => userGroupsService.getUserGroups(),
  });
  const stagesQuery = useQuery({
    queryKey: ["whatsapp-stages"],
    queryFn: () => leadsService.listLeadStages(),
  });

  const [mode, setMode] = useState<WhatsAppRoutingMode>("MANUAL");
  const [sla, setSla] = useState(5);
  const [autoReassign, setAutoReassign] = useState(false);
  const [reassignMinutes, setReassignMinutes] = useState(15);
  const [agentIds, setAgentIds] = useState<string[]>([]);
  const [draftRules, setDraftRules] = useState<WhatsAppRoutingRule[]>([]);
  const [stageDrafts, setStageDrafts] = useState<WhatsAppStageMessage[]>([]);

  useEffect(() => {
    if (!settings) return;
    setMode(settings.routingMode);
    setSla(settings.slaFirstResponseMinutes);
    setAutoReassign(settings.autoReassignEnabled);
    setReassignMinutes(settings.autoReassignMinutes);
    setAgentIds(settings.agentUserIds);
  }, [settings]);

  useEffect(() => {
    if (rules) setDraftRules(rules.length > 0 ? rules : []);
  }, [rules]);

  useEffect(() => {
    const stages = stagesQuery.data ?? [];
    if (stages.length === 0) return;
    const byStage = new Map(
      (stageMessages ?? []).map((item) => [item.stageId, item]),
    );
    setStageDrafts(
      stages.map((stage) => {
        const existing = byStage.get(stage.id);
        return {
          stageId: stage.id,
          stageName: stage.name,
          enabled: existing?.enabled ?? false,
          body: existing?.body ?? "",
          templateName: existing?.templateName ?? "",
          templateLanguage: existing?.templateLanguage ?? "pt_BR",
        };
      }),
    );
  }, [stageMessages, stagesQuery.data]);

  async function handleSave() {
    try {
      await updateSettings.mutateAsync({
        routingMode: mode,
        slaFirstResponseMinutes: sla,
        autoReassignEnabled: autoReassign,
        autoReassignMinutes: reassignMinutes,
        agentUserIds: agentIds,
      });
      await saveRules.mutateAsync(
        draftRules.map((rule, index) => ({
          ...rule,
          matchLabel: rule.matchLabel || null,
          matchStageId: rule.matchStageId || null,
          matchSource: rule.matchSource || null,
          targetUserGroupId: rule.targetUserGroupId || null,
          targetUserId: rule.targetUserId || null,
          priority: index,
        })),
      );
      if (stageDrafts.length > 0) {
        await saveStageMessages.mutateAsync(
          stageDrafts.map((item) => ({
            stageId: item.stageId,
            enabled: item.enabled,
            body: item.body || null,
            templateName: item.templateName || null,
            templateLanguage: item.templateLanguage || null,
          })),
        );
      }
      toast.success("Roteamento da inbox salvo.");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar o roteamento.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Atribuição e SLA</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Modo de atribuição
            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
              value={mode}
              onChange={(event) =>
                setMode(event.target.value as WhatsAppRoutingMode)
              }
            >
              {MODE_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <span className="font-normal text-slate-400">
              {MODE_OPTIONS.find((item) => item.id === mode)?.hint}
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              SLA 1ª resposta (min)
              <Input
                type="number"
                min={1}
                value={sla}
                onChange={(event) => setSla(Number(event.target.value) || 1)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              Reatribuir após (min)
              <Input
                type="number"
                min={1}
                value={reassignMinutes}
                onChange={(event) =>
                  setReassignMinutes(Number(event.target.value) || 1)
                }
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={autoReassign}
              onChange={(event) => setAutoReassign(event.target.checked)}
            />
            Reatribuir automaticamente se o atendente não responder
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Pool de atendentes (vazio = todos)
            <select
              multiple
              className="h-28 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
              value={agentIds}
              onChange={(event) =>
                setAgentIds(
                  Array.from(event.target.selectedOptions, (option) => option.value),
                )
              }
            >
              {(membersQuery.data ?? []).map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          {mode === "SPECIALTY" ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">
                  Regras (etiqueta / funil / origem)
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDraftRules((current) => [...current, emptyRule()])}
                >
                  Adicionar
                </Button>
              </div>
              {draftRules.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Sem regras. Round-robin no pool será usado como fallback.
                </p>
              ) : (
                draftRules.map((rule, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-lg border border-slate-200 p-2"
                  >
                    <Input
                      placeholder="Etiqueta (ex: VIP)"
                      value={rule.matchLabel ?? ""}
                      onChange={(event) =>
                        setDraftRules((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, matchLabel: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                    <select
                      className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm"
                      value={rule.matchStageId ?? ""}
                      onChange={(event) =>
                        setDraftRules((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, matchStageId: event.target.value }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="">Qualquer etapa do funil</option>
                      {(stagesQuery.data ?? []).map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Origem da campanha (ex: instagram)"
                      value={rule.matchSource ?? ""}
                      onChange={(event) =>
                        setDraftRules((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, matchSource: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                    <select
                      className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm"
                      value={rule.targetUserGroupId ?? ""}
                      onChange={(event) =>
                        setDraftRules((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, targetUserGroupId: event.target.value }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="">Departamento / grupo</option>
                      {(groupsQuery.data ?? []).map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm"
                      value={rule.targetUserId ?? ""}
                      onChange={(event) =>
                        setDraftRules((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, targetUserId: event.target.value }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="">Ou vendedor específico</option>
                      {(membersQuery.data ?? []).map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDraftRules((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      Remover regra
                    </Button>
                  </div>
                ))
              )}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-slate-500">
              Mensagem ao mover o card no funil
            </p>
            <p className="text-[11px] text-slate-400">
              Use {"{{primeiro_nome}}"}, {"{{nome}}"}, {"{{valor_proposta}}"},
              {" {{etapa}}"}, {"{{origem}}"}, {"{{cnpj}}"}, {"{{cargo}}"}.
            </p>
            {stageDrafts.map((item, index) => (
              <div
                key={item.stageId}
                className="rounded-lg border border-slate-200 p-2"
              >
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(event) =>
                      setStageDrafts((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, enabled: event.target.checked }
                            : row,
                        ),
                      )
                    }
                  />
                  {item.stageName}
                </label>
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                  rows={2}
                  placeholder="Texto da sessão (ou deixe vazio e use um template HSM)"
                  value={item.body ?? ""}
                  onChange={(event) =>
                    setStageDrafts((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index
                          ? { ...row, body: event.target.value }
                          : row,
                      ),
                    )
                  }
                />
                <Input
                  className="mt-1 h-7 text-xs"
                  placeholder="Template HSM (opcional)"
                  value={item.templateName ?? ""}
                  onChange={(event) =>
                    setStageDrafts((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index
                          ? { ...row, templateName: event.target.value }
                          : row,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>

          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={
              updateSettings.isPending ||
              saveRules.isPending ||
              saveStageMessages.isPending
            }
          >
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
