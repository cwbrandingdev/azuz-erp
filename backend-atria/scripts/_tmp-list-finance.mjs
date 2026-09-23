import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const rows = await prisma.financialTransaction.findMany({
  where: { deletedAt: null },
  include: {
    category: { select: { name: true, code: true, type: true } },
    client: { select: { companyName: true } },
  },
  orderBy: [{ type: "asc" }, { date: "asc" }],
});

const items = rows.map((tx) => ({
  type: tx.type,
  status: tx.status,
  amount: Number(tx.amount),
  date: tx.date.toISOString().slice(0, 10),
  dueDate: tx.dueDate ? tx.dueDate.toISOString().slice(0, 10) : null,
  title: tx.title,
  description: tx.description,
  category: tx.category?.name ?? null,
  categoryCode: tx.category?.code ?? null,
  client: tx.client?.companyName ?? null,
}));

const summary = items.reduce((acc, item) => {
  const key = `${item.type}|${item.categoryCode ?? "-"}|${item.category}`;
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({ count: items.length, summary, items }, null, 2));
await prisma.$disconnect();
