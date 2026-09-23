"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { financeService } from "@/services";
import type { BankAccount } from "@/services/types";

interface BankAccountsDialogProps {
  onChange?: () => void;
}

export function BankAccountsDialog({ onChange }: BankAccountsDialogProps) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");
  const [importAccountId, setImportAccountId] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await financeService.getBankAccounts();
    setAccounts(data);
    if (!importAccountId && data[0]) setImportAccountId(data[0].id);
  }

  useEffect(() => {
    if (!open) return;
    load().catch(() => toast.error("Não foi possível carregar as contas."));
  }, [open]);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Informe o nome da conta.");
      return;
    }
    setSaving(true);
    try {
      await financeService.createBankAccount({
        name: name.trim(),
        institution: institution.trim() || undefined,
        initialBalance: Number(initialBalance.replace(",", ".")) || 0,
      });
      setName("");
      setInstitution("");
      setInitialBalance("0");
      await load();
      onChange?.();
      toast.success("Conta bancária criada.");
    } catch {
      toast.error("Não foi possível criar a conta.");
    } finally {
      setSaving(false);
    }
  }

  async function handleOfx(file: File) {
    if (!importAccountId) {
      toast.error("Cadastre uma conta antes de importar o OFX.");
      return;
    }
    const content = await file.text();
    try {
      const result = await financeService.importBankOfx(importAccountId, content);
      toast.success(
        `${result.created} linha(s) importada(s). ${result.skipped} já existiam.`,
      );
      onChange?.();
    } catch {
      toast.error("Não foi possível ler o arquivo OFX.");
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Configurar Bancos
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--atria-primary)]">
            Contas bancárias
          </h2>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </div>

        <ul className="mb-4 flex flex-col gap-2">
          {accounts.length === 0 && (
            <li className="text-sm text-[var(--atria-primary)]/60">
              Nenhuma conta cadastrada. O saldo continua no caixa único.
            </li>
          )}
          {accounts.map((account) => (
            <li
              key={account.id}
              className="rounded-lg border border-[var(--atria-primary)]/10 px-3 py-2 text-sm"
            >
              <span className="font-medium">{account.name}</span>
              {account.institution ? (
                <span className="text-[var(--atria-primary)]/50">
                  {" "}
                  · {account.institution}
                </span>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome da conta"
          />
          <Input
            value={institution}
            onChange={(event) => setInstitution(event.target.value)}
            placeholder="Banco"
          />
          <Input
            value={initialBalance}
            onChange={(event) => setInitialBalance(event.target.value)}
            placeholder="Saldo inicial"
          />
          <Button type="button" onClick={handleCreate} disabled={saving}>
            Adicionar conta
          </Button>
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-[var(--atria-primary)]/10 pt-4">
          <label className="text-sm font-medium text-[var(--atria-primary)]">
            Importar OFX
          </label>
          <select
            className="h-8 rounded-lg border border-input px-2 text-sm"
            value={importAccountId}
            onChange={(event) => setImportAccountId(event.target.value)}
          >
            <option value="">Selecione a conta</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <Input
            type="file"
            accept=".ofx,.qfx,.txt"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleOfx(file);
              event.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}
