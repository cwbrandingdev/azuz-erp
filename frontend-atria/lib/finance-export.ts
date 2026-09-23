export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function downloadWorkbook(
  filename: string,
  sheets: { name: string; rows: (string | number | null)[][] }[],
) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31));
    for (const row of sheet.rows) {
      worksheet.addRow(row);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function printReport(title: string, bodyHtml: string) {
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) return;

  popup.document.write(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #14221f; padding: 24px; }
      h1 { font-size: 20px; margin: 0 0 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border-bottom: 1px solid #d9e2df; padding: 6px 8px; text-align: left; }
      td.num, th.num { text-align: right; white-space: nowrap; }
      .positive { color: #059669; }
      .negative { color: #dc2626; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    ${bodyHtml}
    <script>window.print()</script>
  </body>
</html>`);
  popup.document.close();
}
