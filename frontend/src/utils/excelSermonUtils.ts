import type { ParsedSermonRow } from "@/types/sermonImport";
import type { Collection, Event, Sermon } from "@/types/types";
import ExcelJS, { type CellValue } from "exceljs";

const EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

async function saveWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: EXCEL_MIME });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function cellToString(cell: ExcelJS.Cell): string {
  if (cell.text) {
    return cell.text.trim();
  }

  const value = cell.value;
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim();
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("").trim();
    }
    if ("formula" in value && "result" in value) {
      const result = value.result;
      return result == null ? "" : String(result);
    }
  }

  return String(value);
}

/* ──────────────────────────────
   Export a blank sermon template
──────────────────────────────── */
export function exportSermonTemplate(collectionCount = 3) {
  const count = Math.max(1, Math.floor(collectionCount));
  const baseHeaders = [
    "event_title",
    "event_start_time",
    "event_end_time",
    "speaker",
  ];

  const collectionHeaders = Array.from({ length: count }, (_, i) => [
    `collection_${i + 1}_name`,
    `collection_${i + 1}_description`,
  ]).flat();

  const headers = [...baseHeaders, ...collectionHeaders];

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Preken-template");
  worksheet.addRow(headers);
  void saveWorkbook(workbook, "preken_import_template.xlsx");
}

/* ──────────────────────────────
   Parse Excel into sermon objects
──────────────────────────────── */
export async function parseSermonsExcel(
  file: File
): Promise<ParsedSermonRow[]> {
  const data = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headerValues = headerRow.values ?? [];
  const rawHeaders: CellValue[] = Array.isArray(headerValues)
    ? headerValues
    : (Object.values(headerValues) as CellValue[]);
  const headers = rawHeaders
    .slice(1)
    .map((value: CellValue) => (value == null ? "" : String(value).trim()));

  const rows: Record<string, string>[] = [];
  const lastRow = sheet.rowCount;

  for (let rowIndex = 2; rowIndex <= lastRow; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    const rowData: Record<string, string> = {};
    let hasData = false;

    headers.forEach((header: string, headerIndex: number) => {
      if (!header) return;
      const value = cellToString(row.getCell(headerIndex + 1));
      rowData[header] = value;
      if (value) {
        hasData = true;
      }
    });

    if (hasData) {
      rows.push(rowData);
    }
  }

  return rows.map((row) => {
    const collections = Object.keys(row)
      .filter((key) => key.startsWith("collection_") && key.endsWith("_name"))
      .map((key) => {
        const index = key.split("_")[1];
        return {
          name: row[key],
          description: row[`collection_${index}_description`] ?? "",
        };
      });

    return {
      event_title: row.event_title ?? "",
      event_start_time: row.event_start_time ?? "",
      event_end_time: row.event_end_time ?? "",
      speaker: row.speaker ?? "",
      collections,
    };
  });
}


function formatLocalRFC3339(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (input: number) => String(input).padStart(2, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? "+" : "-";
  const offsetAbs = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(offsetAbs / 60));
  const offsetRemainingMinutes = pad(offsetAbs % 60);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}${offsetSign}${offsetHours}:${offsetRemainingMinutes}`;
}


/* ──────────────────────────────
   Export sermons to Excel (uniform with import)
──────────────────────────────── */
export function exportSermonsToExcel(
  sermons: (Sermon & { event?: Event; collections?: Collection[] })[]
) {
  if (!sermons?.length) return;

  // Find maximum number of collections across all sermons
  const maxCollections = Math.max(
    1,
    ...sermons.map((s) => s.collections?.length ?? 0)
  );

  // Build header columns dynamically
  const headers = [
    "event_title",
    "event_start_time",
    "event_end_time",
    "speaker",
    ...Array.from({ length: maxCollections }, (_, i) => [
      `collection_${i + 1}_name`,
      `collection_${i + 1}_description`,
    ]).flat(),
  ];

  // Map sermons to uniform row objects
  const rows = sermons.map((s) => {
    const row: Record<string, string> = {
      event_title: s.event?.title ?? "",
      event_start_time: formatLocalRFC3339(s.event?.start_time ?? ""),
      event_end_time: formatLocalRFC3339(s.event?.end_time ?? ""),
      speaker: s.speaker ?? "",
    };

    (s.collections ?? []).forEach((c, idx) => {
      row[`collection_${idx + 1}_name`] = c.name ?? "";
      row[`collection_${idx + 1}_description`] = c.description ?? "";
    });

    // Fill missing collection slots with blanks for consistent columns
    for (let i = (s.collections?.length ?? 0) + 1; i <= maxCollections; i++) {
      row[`collection_${i}_name`] = "";
      row[`collection_${i}_description`] = "";
    }

    return row;
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Preken");
  worksheet.addRow(headers);
  worksheet.addRows(
    rows.map((row) => headers.map((header) => row[header] ?? ""))
  );
  void saveWorkbook(workbook, "preken_export.xlsx");
}
