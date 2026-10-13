"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWhatsappMutations } from "@/hooks/use-whatsapp";
import { toast } from "@/lib/toast";
import { userGroupsService, usersService } from "@/services";
import type { WhatsAppMessage } from "@/services/whatsapp.service";

export function WhatsappTransferDialog({
  open,
  onOpenChange,
  phone,
  onTransferred,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
  onTransferred: (note: WhatsAppMessage) => void;
}) {
  const { transferConversation } = useWhatsappMutations();
  const membersQuery = useQuery({
    queryKey: ["whatsapp-members"],
    queryFn: () => usersService.getMembers(),
  });
  const groupsQuery = useQuery({
    queryKey: ["whatsapp-groups"],
    queryFn: () => userGroupsService.getUserGroups(),
  });
  const [targetUserId, setTargetUserId] = useState("");
  const [targetGroupId, setTargetGroupId] = useState("");
  const [note, setNote] = useState("");

  async function handleSubmit() {
    if (!targetUserId && !targetGroupId) {
      toast.error("Escolha um atendente ou um setor.");
      return;
    }
    if (note.trim().length < 8) {
      toast.error("Descreva o contexto da transferência (mín. 8 caracteres).");
      return;
    }
    try {
      const result = await transferConversation.mutateAsync({
        phone,
        note: note.trim(),
        targetUserId: targetUserId || null,
        targetUserGroupId: targetGroupId || null,
      });
      onTransferred(result.note);
      setNote("");
      setTargetUserId("");
      setTargetGroupId("");
      onOpenChange(false);
      toast.success("Conversa transferida.");
    } catch {
      toast.error("Não foi possível transferir a conversa.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir conversa</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500">
          A nota de contexto é obrigatória. O próximo atendente vê isso como
          nota privada.
        </p>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Atendente
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
            value={targetUserId}
            onChange={(event) => {
              setTargetUserId(event.target.value);
              if (event.target.value) setTargetGroupId("");
            }}
          >
            <option value="">Escolher pessoa</option>
            {(membersQuery.data ?? []).map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Ou setor
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
            value={targetGroupId}
            onChange={(event) => {
              setTargetGroupId(event.target.value);
              if (event.target.value) setTargetUserId("");
            }}
          >
            <option value="">Escolher setor</option>
            {(groupsQuery.data ?? []).map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <textarea
          className="min-h-24 w-full rounded-md border border-slate-200 p-2 text-sm"
          placeholder="O que já foi combinado, o que falta e por que está passando"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Button
          type="button"
          disabled={transferConversation.isPending}
          onClick={() => void handleSubmit()}
        >
          Transferir
        </Button>
      </DialogContent>
    </Dialog>
  );
}
