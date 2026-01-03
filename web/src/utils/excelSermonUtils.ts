import type { ParsedSermonRow } from "@/types/sermonImport";
import type { Collection, Event, Sermon } from "@/types/types";
import * as XLSX from "xlsx";

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

  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Preken-template");
  XLSX.writeFile(wb, "preken_import_template.xlsx");
}

/* ──────────────────────────────
   Parse Excel into sermon objects
──────────────────────────────── */
export async function parseSermonsExcel(
  file: File
): Promise<ParsedSermonRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

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
      event_start_time: s.event?.start_time ?? "",
      event_end_time: s.event?.end_time ?? "",
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

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Preken");
  XLSX.writeFile(wb, "preken_export.xlsx");
}
