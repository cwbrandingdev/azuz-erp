import { apiRequest } from "./api";
import type {
  AnnualDre,
  BankAccount,
  CashFlowStatement,
  ChartAccount,
  CreateCategoryInput,
  CreateTransactionInput,
  ImportFinanceTransactionInput,
  BulkImportTransactionsResult,
  FinanceCategory,
  FinanceDueTodayAlerts,
  FinanceMonthlyCashflow,
  FinanceOverview,
  FinanceTransaction,
  ManagementDashboard,
  PaginatedTransactions,
  ProjectedCashFlow,
  ReconciliationData,
  SortOrder,
  TransactionSortField,
  UpdateCategoryInput,
} from "./types";

export async function getLegacyFinanceOverview(params?: {
  month?: number;
  year?: number;
}): Promise<FinanceOverview> {
  const query = new URLSearchParams();
  if (params?.month) query.set("month", String(params.month));
  if (params?.year) query.set("year", String(params.year));

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<FinanceOverview>(`/finance/legacy/overview${suffix}`);
}

export async function getLegacyCategories(
  type?: "income" | "expense",
): Promise<FinanceCategory[]> {
  const query = type ? `?type=${type.toUpperCase()}` : "";
  const categories = await apiRequest<
    { id: string; name: string; type: string; color: string }[]
  >(`/finance/legacy/categories${query}`);

  return (categories ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
    type: String(category.type ?? "")
      .toLowerCase()
      .includes("expense")
      ? ("expense" as const)
      : ("income" as const),
  }));
}

export async function getLegacyTransactions(params?: {
  page?: number;
  limit?: number;
  type?: "income" | "expense";
  status?: "paid" | "pending" | "overdue";
  categoryId?: string;
  categoryIds?: string[];
  from?: string;
  to?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: TransactionSortField;
  sortOrder?: SortOrder;
}): Promise<PaginatedTransactions> {
  const entries: [string, string][] = [];

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === "") continue;

    if (key === "categoryIds" && Array.isArray(value)) {
      if (value.length > 0) {
        entries.push(["categoryIds", value.join(",")]);
      }
      continue;
    }

    if (key === "type" || key === "status") {
      entries.push([key, String(value).toUpperCase()]);
      continue;
    }

    entries.push([key, String(value)]);
  }

  const query = new URLSearchParams(entries).toString();
  return apiRequest<PaginatedTransactions>(
    `/finance/legacy/transactions${query ? `?${query}` : ""}`,
  );
}

export async function getFinanceOverview(params?: {
  month?: number;
  year?: number;
}): Promise<FinanceOverview> {
  const query = new URLSearchParams();
  if (params?.month) query.set("month", String(params.month));
  if (params?.year) query.set("year", String(params.year));

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<FinanceOverview>(`/finance/overview${suffix}`);
}

export async function getCashFlow(params?: {
  month?: number;
  year?: number;
}): Promise<
  Pick<
    FinanceOverview,
    | "totalRevenue"
    | "totalExpenses"
    | "netProfit"
    | "profitMargin"
    | "pendingReceivables"
    | "pendingPayables"
    | "monthlyCashFlow"
    | "expenseByCategory"
  >
> {
  const query = new URLSearchParams();
  if (params?.month) query.set("month", String(params.month));
  if (params?.year) query.set("year", String(params.year));

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest(`/finance/cash-flow${suffix}`);
}

export async function getDueTodayAlerts(): Promise<FinanceDueTodayAlerts> {
  return apiRequest<FinanceDueTodayAlerts>("/api/finances/due-today-alerts", {
    skipToast: true,
  });
}

export async function getMonthlyCashflow(params?: {
  year?: number;
}): Promise<FinanceMonthlyCashflow> {
  const query = new URLSearchParams();
  if (params?.year) query.set("year", String(params.year));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<FinanceMonthlyCashflow>(
    `/api/finances/monthly-cashflow${suffix}`,
  );
}

export async function getCategories(
  type?: "income" | "expense",
): Promise<FinanceCategory[]> {
  const query = type ? `?type=${type.toUpperCase()}` : "";
  const categories = await apiRequest<
    { id: string; name: string; type: string; color: string }[]
  >(`/finance/categories${query}`);

  return (categories ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
    type: String(category.type ?? "")
      .toLowerCase()
      .includes("expense")
      ? ("expense" as const)
      : ("income" as const),
  }));
}

export async function createCategory(
  data: CreateCategoryInput,
): Promise<FinanceCategory> {
  const category = await apiRequest<{
    id: string;
    name: string;
    type: string;
    color: string;
  }>("/finance/categories", {
    method: "POST",
    body: {
      ...data,
      type: data.type.toUpperCase(),
    },
  });

  return {
    ...category,
    type: category.type.toLowerCase() as "income" | "expense",
  };
}

export async function updateCategory(
  id: string,
  data: UpdateCategoryInput,
): Promise<FinanceCategory> {
  const category = await apiRequest<{
    id: string;
    name: string;
    type: string;
    color: string;
  }>(`/finance/categories/${id}`, {
    method: "PATCH",
    body: data,
  });

  return {
    ...category,
    type: category.type.toLowerCase() as "income" | "expense",
  };
}

export async function deleteCategory(id: string): Promise<void> {
  return apiRequest<void>(`/finance/categories/${id}`, {
    method: "DELETE",
  });
}

export async function getTransactions(params?: {
  page?: number;
  limit?: number;
  type?: "income" | "expense";
  status?: "paid" | "pending" | "overdue";
  categoryId?: string;
  categoryIds?: string[];
  from?: string;
  to?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: TransactionSortField;
  sortOrder?: SortOrder;
}): Promise<PaginatedTransactions> {
  const entries: [string, string][] = [];

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === "") continue;

    if (key === "categoryIds" && Array.isArray(value)) {
      if (value.length > 0) {
        entries.push(["categoryIds", value.join(",")]);
      }
      continue;
    }

    if (key === "type" || key === "status") {
      entries.push([key, String(value).toUpperCase()]);
      continue;
    }

    entries.push([key, String(value)]);
  }

  const query = new URLSearchParams(entries).toString();

  return apiRequest<PaginatedTransactions>(
    `/finance/transactions${query ? `?${query}` : ""}`,
  );
}

export async function createTransaction(
  data: CreateTransactionInput,
): Promise<FinanceTransaction> {
  return apiRequest<FinanceTransaction>("/finance/transactions", {
    method: "POST",
    body: {
      ...data,
      type: data.type.toUpperCase(),
      status: data.status?.toUpperCase(),
    },
  });
}

export async function updateTransaction(
  id: string,
  data: Partial<CreateTransactionInput>,
): Promise<FinanceTransaction> {
  const body: Record<string, unknown> = { ...data };
  if (data.type) body.type = data.type.toUpperCase();
  if (data.status) body.status = data.status.toUpperCase();

  return apiRequest<FinanceTransaction>(`/finance/transactions/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  return apiRequest<void>(`/finance/transactions/${id}`, {
    method: "DELETE",
  });
}

export async function markTransactionAsPaid(
  id: string,
): Promise<FinanceTransaction> {
  return updateTransaction(id, { status: "paid" });
}

export async function bulkImportTransactions(
  transactions: ImportFinanceTransactionInput[],
): Promise<BulkImportTransactionsResult> {
  return apiRequest<BulkImportTransactionsResult>("/finance/transactions/import", {
    method: "POST",
    body: {
      transactions: transactions.map((transaction) => ({
        ...transaction,
        status: transaction.status?.toUpperCase(),
        type: transaction.type?.toUpperCase(),
      })),
    },
  });
}

function mapChartAccount(category: {
  id: string;
  name: string;
  type: string;
  color: string;
  code?: string | null;
  parentId?: string | null;
  dreGroup?: string | null;
  cashFlowBlock?: string;
  isGroup?: boolean;
}): ChartAccount {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    code: category.code ?? null,
    parentId: category.parentId ?? null,
    dreGroup: category.dreGroup ?? null,
    cashFlowBlock: category.cashFlowBlock ?? "OPERATIONAL",
    isGroup: Boolean(category.isGroup),
    type: String(category.type).toLowerCase().includes("expense")
      ? "expense"
      : "income",
  };
}

export async function getChartOfAccounts(): Promise<ChartAccount[]> {
  const categories = await apiRequest<
    Parameters<typeof mapChartAccount>[0][]
  >("/finance/chart-of-accounts");
  return (categories ?? []).map(mapChartAccount);
}

export async function getManagementDashboard(params?: {
  from?: string;
  to?: string;
  chartYear?: number;
}): Promise<ManagementDashboard> {
  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.chartYear) query.set("chartYear", String(params.chartYear));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<ManagementDashboard>(`/finance/management-dashboard${suffix}`);
}

export async function getCashFlowStatement(params?: {
  from?: string;
  to?: string;
  type?: "income" | "expense";
  categoryId?: string;
  bankAccountId?: string;
  status?: "paid" | "pending" | "overdue";
  search?: string;
}): Promise<CashFlowStatement> {
  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.type) query.set("type", params.type.toUpperCase());
  if (params?.categoryId) query.set("categoryId", params.categoryId);
  if (params?.bankAccountId) query.set("bankAccountId", params.bankAccountId);
  if (params?.status) query.set("status", params.status.toUpperCase());
  if (params?.search) query.set("search", params.search);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<CashFlowStatement>(`/finance/cash-flow-statement${suffix}`);
}

export async function getProjectedCashFlow(params?: {
  to?: string;
  type?: "income" | "expense";
}): Promise<ProjectedCashFlow> {
  const query = new URLSearchParams();
  if (params?.to) query.set("to", params.to);
  if (params?.type) query.set("type", params.type.toUpperCase());
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<ProjectedCashFlow>(`/finance/projected-cash-flow${suffix}`);
}

export async function getAnnualDre(year: number): Promise<AnnualDre> {
  return apiRequest<AnnualDre>(`/finance/dre?year=${year}`);
}

export async function getBankAccounts(): Promise<BankAccount[]> {
  return apiRequest<BankAccount[]>("/finance/banks");
}

export async function createBankAccount(data: {
  name: string;
  institution?: string;
  initialBalance?: number;
}): Promise<BankAccount> {
  return apiRequest<BankAccount>("/finance/banks", {
    method: "POST",
    body: data,
  });
}

export async function importBankOfx(
  bankAccountId: string,
  content: string,
): Promise<{ created: number; skipped: number }> {
  return apiRequest<{ created: number; skipped: number }>(
    `/finance/banks/${bankAccountId}/ofx`,
    { method: "POST", body: { content } },
  );
}

export async function getReconciliation(
  bankAccountId?: string,
): Promise<ReconciliationData> {
  const suffix = bankAccountId
    ? `?bankAccountId=${encodeURIComponent(bankAccountId)}`
    : "";
  return apiRequest<ReconciliationData>(`/finance/reconciliation${suffix}`);
}

export async function matchStatementLine(
  statementLineId: string,
  transactionId: string,
): Promise<void> {
  await apiRequest("/finance/reconciliation/match", {
    method: "POST",
    body: { statementLineId, transactionId },
  });
}

export async function ignoreStatementLines(ids: string[]): Promise<void> {
  await apiRequest("/finance/reconciliation/ignore", {
    method: "POST",
    body: { ids },
  });
}
