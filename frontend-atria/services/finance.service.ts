import { apiRequest } from "./api";
import type {
  CreateCategoryInput,
  CreateTransactionInput,
  ImportFinanceTransactionInput,
  BulkImportTransactionsResult,
  FinanceCategory,
  FinanceDueTodayAlerts,
  FinanceMonthlyCashflow,
  FinanceOverview,
  FinanceTransaction,
  PaginatedTransactions,
  SortOrder,
  TransactionSortField,
  UpdateCategoryInput,
} from "./types";

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
