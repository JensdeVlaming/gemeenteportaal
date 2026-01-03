import { ImportStatus, type ImportResultRow, type ImportRow } from "./types.ts";

export type NormalizedRow = ReturnType<typeof normalizeRow>;

export function trim(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeRow(row: ImportRow) {
  return {
    event_title: trim(row.event_title),
    event_start_time: trim(row.event_start_time),
    event_end_time: trim(row.event_end_time),
    speaker: trim(row.speaker),
    collections: (row.collections ?? [])
      .map((collection) => ({
        name: trim(collection?.name),
        description: trim(collection?.description),
      }))
      .filter((collection) => collection.name),
    message: row.message ?? null,
  };
}

export function emptyRow(
  status: ImportStatus,
  message: string
): ImportResultRow {
  return {
    event_title: "",
    event_start_time: "",
    event_end_time: "",
    speaker: "",
    collections: [],
    status,
    message,
  };
}

export function toIso(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function markDuplicateRows(rows: ImportResultRow[]): ImportResultRow[] {
  const seen = new Map<string, number>();

  return rows.map((row) => {
    const key = `${row.event_start_time.toLowerCase()}|${row.speaker.toLowerCase()}`;
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);

    if (
      count > 0 &&
      row.status !== ImportStatus.Ongeldig &&
      row.status !== ImportStatus.Fout
    ) {
      return {
        ...row,
        status: ImportStatus.Dubbel,
        message:
          row.message ??
          "Dubbele rij in het bestand. Alleen de eerste wordt geïmporteerd.",
      };
    }

    return row;
  });
}

export function invalidRow(
  row: NormalizedRow,
  message: string
): ImportResultRow {
  return {
    ...row,
    collections: row.collections,
    status: ImportStatus.Ongeldig,
    message,
    event_title: row.event_title,
    event_start_time: row.event_start_time,
    event_end_time: row.event_end_time,
    speaker: row.speaker,
  };
}

export function validateRow(row: NormalizedRow): ImportResultRow {
  if (!row.event_start_time || !row.event_end_time) {
    return invalidRow(row, "Ontbrekende start- of eindtijd.");
  }

  if (!row.speaker) {
    return invalidRow(row, "Ontbrekende spreker.");
  }

  const startIso = toIso(row.event_start_time);
  const endIso = toIso(row.event_end_time);

  if (!startIso || !endIso) {
    return invalidRow(row, "Ongeldige datum of tijd.");
  }

  if (new Date(endIso) <= new Date(startIso)) {
    return invalidRow(row, "Eindtijd moet later zijn dan starttijd.");
  }

  return {
    ...row,
    event_start_time: startIso,
    event_end_time: endIso,
    collections: row.collections,
    status: ImportStatus.Nieuw,
    message: row.message ?? null,
    event_title: row.event_title,
    speaker: row.speaker,
  };
}
