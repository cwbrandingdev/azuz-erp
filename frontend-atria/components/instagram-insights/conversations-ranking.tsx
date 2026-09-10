"use client";

import { MessageCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InstagramConversationRow } from "@/services/types";

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

interface ConversationsRankingProps {
  clients: InstagramConversationRow[];
  selectedClientId?: string;
  onSelect: (clientId: string) => void;
}

export function ConversationsRanking({
  clients,
  selectedClientId,
  onSelect,
}: ConversationsRankingProps) {
  const totalConversations = clients.reduce(
    (sum, client) => sum + client.conversationsStarted,
    0,
  );

  if (clients.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 bg-white px-6 py-10 text-center text-sm text-[var(--atria-primary)]/55">
        Nenhuma empresa conectada para este mês.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--atria-primary)]/10 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--atria-primary)]/10 px-5 py-4">
        <div className="flex items-center gap-2 text-[var(--atria-primary)]">
          <MessageCircle className="size-4" />
          <p className="text-sm font-semibold">Conversas por empresa</p>
        </div>
        <p className="text-xs text-[var(--atria-primary)]/50">
          {formatNumber(totalConversations)} conversas no mês
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead className="text-right">Conversas</TableHead>
            <TableHead className="text-right">Comentários</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client, index) => {
            const selected = client.id === selectedClientId;
            return (
              <TableRow
                key={client.id}
                className={`cursor-pointer ${
                  selected ? "bg-[var(--atria-accent)]/20" : ""
                }`}
                onClick={() => onSelect(client.id)}
              >
                <TableCell className="text-[var(--atria-primary)]/45">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <p className="font-medium text-[var(--atria-primary)]">
                    {client.companyName}
                  </p>
                  {client.instagram ? (
                    <p className="text-xs text-[var(--atria-primary)]/45">
                      {client.instagram}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="text-right text-base font-semibold text-[var(--atria-primary)]">
                  {formatNumber(client.conversationsStarted)}
                </TableCell>
                <TableCell className="text-right text-[var(--atria-primary)]/70">
                  {formatNumber(client.comments)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
