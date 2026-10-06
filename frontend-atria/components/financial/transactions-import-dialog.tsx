"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/services";
import { toast } from "@/lib/toast";
import { invalidateFinanceQueries } from "@/lib/query-invalidation";
import {
  readFinanceTransactionsFromArrayBuffer,
  type ImportFinanceTransactionInput,
} from "@/lib/financial-import";

interface TransactionsImportDialogProps {
  onSuccess: () => void;
}

export function TransactionsImportDialog({
  onSuccess,
}: TransactionsImportDialogProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);
  const [transactions, setTransactions] = useState<
    ImportFinanceTransactionInput[]
  >([]);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      if (!(data instanceof ArrayBuffer)) return;

      const parsed = readFinanceTransactionsFromArrayBuffer(data);
      setTransactions(parsed);
      setPreviewCount(parsed.length);
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    if (transactions.length === 0) return;

    setLoading(true);
    try {
      const result = await financeService.bulkImportTransactions(transactions);
      toast.success(`${result.created} transação(ões) importada(s)`);
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} linha(s) com erro`);
      }
      setOpen(false);
      setTransactions([]);
      setPreviewCount(0);
      void invalidateFinanceQueries(queryClient);
      onSuccess();
    } catch (error) {
      toast.error("Não foi possível importar as transações.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="border-[var(--atria-primary)]/20"
          />
        }
      >
        <FileSpreadsheet className="size-4" />
        Importar Excel
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[var(--atria-primary)]">
            Importar transações (.xlsx / .csv)
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[var(--atria-primary)]/55">
          Formatos aceitos: planilha legada (DESPESAS, VALOR, VENC., REF,
          STATUS, EMPRESA, GESTOR, SERVIÇO, DATA) ou planilha CW (DESCRIÇÃO,
          VALOR, VENC., STATUS, TIPO, CATEGORIA).
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
            event.target.value = "";
          }}
        />

        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-4" />
          Selecionar planilha
        </Button>

        {previewCount > 0 && (
          <p className="text-sm text-[var(--atria-primary)]">
            {previewCount} transação(ões) pronta(s) para importar
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            onClick={handleImport}
            disabled={loading || transactions.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Importando...
              </>
            ) : (
              "Importar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
