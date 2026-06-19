import type { ExecutiveDashboardSnapshot } from "@/domain/entities/analytics";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function createExcelExport(snapshot: ExecutiveDashboardSnapshot) {
  const rows = [
    ["Metric", "Value"],
    ["Total Assets", String(snapshot.totalAssets)],
    ["Repair Cost", snapshot.repairCost.toFixed(2)],
    ["MTBF Hours", snapshot.mtbfHours?.toFixed(2) ?? "N/A"],
    ["PM Completion Rate", snapshot.pmCompletionRate.toFixed(2) + "%"],
    ...Object.entries(snapshot.assetsByStatus).map(([status, value]) => [
      `Assets: ${status}`,
      String(value),
    ]),
  ];
  const table = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeXml(cell)}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${table}</table></body></html>`;
}

function pdfEscape(value: string): string {
  return value
    .replace(/[^\x20-\x7E]/g, "?")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

export function createPdfExport(snapshot: ExecutiveDashboardSnapshot): Buffer {
  const lines = [
    "Hillkoff Executive Dashboard",
    `Generated: ${snapshot.generatedAt.toISOString()}`,
    `Source: ${snapshot.source}`,
    `Total Assets: ${snapshot.totalAssets}`,
    `Repair Cost: ${snapshot.repairCost.toFixed(2)} THB`,
    `MTBF: ${snapshot.mtbfHours?.toFixed(2) ?? "N/A"} hours`,
    `PM Completion Rate: ${snapshot.pmCompletionRate.toFixed(2)}%`,
    ...Object.entries(snapshot.assetsByStatus).map(
      ([status, value]) => `Assets ${status}: ${value}`,
    ),
    "",
    "Top Failure Assets",
    ...snapshot.topFailureAssets.map(
      (item) => `${item.assetCode} ${item.assetName}: ${item.value}`,
    ),
    "",
    "Low Stock Parts",
    ...snapshot.lowStockParts.map(
      (item) =>
        `${item.partNumber} ${item.name}: ${item.quantityOnHand}/${item.reorderPoint}`,
    ),
  ];
  const content = [
    "BT",
    "/F1 12 Tf",
    "50 790 Td",
    ...lines.flatMap((line, index) =>
      index === 0
        ? [`(${pdfEscape(line)}) Tj`]
        : ["0 -18 Td", `(${pdfEscape(line)}) Tj`],
    ),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output, "binary");
}
