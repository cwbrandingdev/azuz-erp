import { TransactionType } from '@prisma/client';

export type ParsedOfxTransaction = {
  fitId: string;
  postedAt: string;
  amount: number;
  description: string;
  type: TransactionType;
};

function readTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i'));
  return match?.[1]?.trim() ?? '';
}

function parsePostedDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function parseOfx(content: string): ParsedOfxTransaction[] {
  const blocks = content.split(/<STMTTRN>/i).slice(1);
  const parsed: ParsedOfxTransaction[] = [];

  blocks.forEach((rawBlock, index) => {
    const block = rawBlock.split(/<\/STMTTRN>/i)[0] ?? rawBlock;
    const rawAmount = readTag(block, 'TRNAMT').replace(',', '.');
    const amountValue = Number(rawAmount);
    if (!Number.isFinite(amountValue) || amountValue === 0) return;

    const postedAt = parsePostedDate(readTag(block, 'DTPOSTED'));
    if (!postedAt) return;

    const trnType = readTag(block, 'TRNTYPE').toUpperCase();
    const isExpense =
      amountValue < 0 ||
      trnType === 'DEBIT' ||
      trnType === 'PAYMENT' ||
      trnType === 'CHECK' ||
      trnType === 'XFER' && amountValue < 0;

    const description =
      readTag(block, 'MEMO') ||
      readTag(block, 'NAME') ||
      'Lançamento de extrato';
    const fitId =
      readTag(block, 'FITID') ||
      `gen:${postedAt}:${Math.abs(amountValue).toFixed(2)}:${description}:${index}`;

    parsed.push({
      fitId,
      postedAt,
      amount: Math.round(Math.abs(amountValue) * 100) / 100,
      description,
      type: isExpense ? TransactionType.EXPENSE : TransactionType.INCOME,
    });
  });

  return parsed;
}
