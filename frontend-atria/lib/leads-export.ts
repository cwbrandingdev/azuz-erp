import type { Lead, LeadStatus } from "@/services/types";
import { LEAD_STATUS_LABELS } from "@/lib/leads-kanban-utils";

const STATUS_LABELS: Record<LeadStatus, string> = LEAD_STATUS_LABELS;

const HEADER_FILL = "004A4A";
const HEADER_FONT = "FFFFFF";
const ACCENT_FILL = "D4BA97";
const ALT_ROW_FILL = "F7F1EA";
const BORDER_COLOR = "D9D9D9";

function fileNameFromLeads(leads: Lead[]) {
  const stamp = new Date().toISOString().slice(0, 10);
  const city = leads.find((lead) => lead.city)?.city?.trim();
  const slug = city
    ? city
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase()
    : "leads";
  return `leads-${slug || "export"}-${stamp}.xlsx`;
}

export async function exportLeadsToExcel(leads: Lead[]) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Atria ERP";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Leads", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "Empresa", key: "name", width: 34 },
    { header: "Telefone", key: "phone", width: 18 },
    { header: "E-mail", key: "email", width: 28 },
    { header: "Website", key: "website", width: 28 },
    { header: "Instagram", key: "instagram", width: 28 },
    { header: "Categoria", key: "category", width: 22 },
    { header: "Nota", key: "rating", width: 10 },
    { header: "Avaliações", key: "reviewsCount", width: 12 },
    { header: "Bairro", key: "neighborhood", width: 18 },
    { header: "Cidade", key: "city", width: 20 },
    { header: "Endereço", key: "address", width: 40 },
    { header: "Status", key: "status", width: 16 },
    { header: "Score IA", key: "aiScore", width: 12 },
    { header: "Notas IA", key: "aiNotes", width: 42 },
    { header: "Fonte", key: "source", width: 14 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${HEADER_FILL}` },
    };
    cell.font = {
      bold: true,
      color: { argb: `FF${HEADER_FONT}` },
      size: 11,
      name: "Calibri",
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      bottom: { style: "thin", color: { argb: `FF${ACCENT_FILL}` } },
    };
  });

  leads.forEach((lead, index) => {
    const row = sheet.addRow({
      name: lead.name,
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      website: lead.website ?? "",
      instagram: lead.instagram ?? "",
      category: lead.category ?? "",
      rating: lead.rating ?? "",
      reviewsCount: lead.reviewsCount ?? "",
      neighborhood: lead.neighborhood ?? "",
      city: lead.city ?? "",
      address: lead.address ?? "",
      status: STATUS_LABELS[lead.status] ?? lead.status,
      aiScore: lead.aiScore ?? "",
      aiNotes: lead.aiNotes ?? "",
      source: lead.source ?? "",
    });

    row.height = 20;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: "Calibri", size: 10, color: { argb: "FF1F1F1F" } };
      cell.alignment = {
        vertical: "middle",
        wrapText: colNumber === 8 || colNumber === 11,
      };
      cell.border = {
        bottom: { style: "hair", color: { argb: `FF${BORDER_COLOR}` } },
      };

      if (index % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${ALT_ROW_FILL}` },
        };
      }
    });

    const statusCell = row.getCell("status");
    if (lead.status === "VENDA_FINALIZADA" || lead.status === "POS_VENDA") {
      statusCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDCFCE7" },
      };
      statusCell.font = {
        name: "Calibri",
        size: 10,
        bold: true,
        color: { argb: "FF166534" },
      };
    } else if (lead.status === "NAO_TEM_INTERESSE") {
      statusCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEE2E2" },
      };
      statusCell.font = {
        name: "Calibri",
        size: 10,
        bold: true,
        color: { argb: "FF991B1B" },
      };
    } else if (
      lead.status === "APRESENTACAO" ||
      lead.status === "REUNIAO_AGENDADA"
    ) {
      statusCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${ACCENT_FILL}` },
      };
      statusCell.font = {
        name: "Calibri",
        size: 10,
        bold: true,
        color: { argb: `FF${HEADER_FILL}` },
      };
    }

    const scoreCell = row.getCell("aiScore");
    if (typeof lead.aiScore === "number") {
      scoreCell.alignment = { vertical: "middle", horizontal: "center" };
      if (lead.aiScore >= 60) {
        scoreCell.font = {
          name: "Calibri",
          size: 10,
          bold: true,
          color: { argb: "FF166534" },
        };
      }
    }
  });

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, leads.length + 1), column: 12 },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileNameFromLeads(leads);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
