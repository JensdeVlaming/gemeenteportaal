// deno-lint-ignore-file no-explicit-any

import supabaseClient from "./lib/supbaseClient.ts";
import { ImportStatus, type ImportResultRow, type ImportRow } from "./types.ts";
import {
  emptyRow,
  markDuplicateRows,
  normalizeRow,
  toIso,
  validateRow,
} from "./utils.ts";

export function validateSermonRows(rows: ImportRow[]): ImportResultRow[] {
  if (!rows?.length) {
    return [emptyRow(ImportStatus.Leeg, "Het bestand bevat geen gegevens.")];
  }

  const normalized = rows.map(normalizeRow);
  const validated = normalized.map(validateRow);
  return markDuplicateRows(validated);
}

/**
 * The key that identifies an existing sermon is the combination of its
 * normalized start time and the event title from the import row.
 */
function createSermonKey(start: string) {
  return `${start}`;
}

type CollectionRecord = {
  name?: string | null;
  description?: string | null;
};

type NormalizedCollection = {
  name: string;
  description: string | null;
};

type ExistingSermonInfo = {
  event_id: string;
  sermon_id: string;
  event_title?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  speaker?: string | null;
  collections?: CollectionRecord[];
};

function getTimeRange(rows: ImportResultRow[]) {
  const times = Array.from(
    new Set(
      rows
        .filter((row) => row.status === ImportStatus.Nieuw)
        .map((row) => row.event_start_time)
        .filter(Boolean)
    )
  ).sort();

  if (!times.length) {
    return null;
  }

  return { min: times[0], max: times[times.length - 1] };
}

async function fetchEventsWithSermons(minTime: string, maxTime: string) {
  return await supabaseClient
    .from("events")
    .select(
      "id, title, start_time, end_time, sermons(id, speaker, collections(id, name, description))"
    )
    .gte("start_time", minTime)
    .lte("start_time", maxTime);
}

function buildExistingMap(events: any[] | undefined): Map<string, ExistingSermonInfo> {
  const map = new Map<string, ExistingSermonInfo>();

  for (const event of events ?? []) {
    const startIso = toIso(event?.start_time);
    if (!startIso || !event?.id) continue;

    const sermons = Array.isArray(event.sermons) ? event.sermons : [];
    for (const sermon of sermons) {
      if (!sermon?.id) continue;
      const title = typeof event?.title === "string" ? event.title : "";
      if (!title.trim()) continue;
      const collections = Array.isArray(sermon.collections)
        ? sermon.collections.map((collection: any) => ({
            name: collection?.name ?? "",
            description: collection?.description ?? null,
          }))
        : [];

      map.set(createSermonKey(startIso), {
        event_id: event.id,
        sermon_id: sermon.id,
        event_title: event.title,
        start_time: startIso,
        end_time: toIso(event?.end_time) ?? null,
        speaker: sermon.speaker ?? null,
        collections,
      });
    }
  }

  return map;
}

function normalizeImportedCollection(collection: {
  name?: string | null;
  description?: string | null;
}): NormalizedCollection {
  const normalizeDescription = (value?: string | null) => {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    return trimmed;
  };

  return {
    name: collection.name?.trim().toLowerCase() ?? "",
    description: normalizeDescription(collection.description),
  };
}

function collectionsEqual(
  rowCollections: ImportResultRow["collections"],
  existingCollections?: ExistingSermonInfo["collections"]
) {
  if (rowCollections.length !== (existingCollections?.length ?? 0)) {
    return false;
  }

  const normalizedRow = [...rowCollections]
    .map(normalizeImportedCollection)
    .sort((a, b) => a.name.localeCompare(b.name));
  const normalizedExisting = (
    existingCollections ?? []
  )
    .filter((collection) => Boolean(collection?.name))
    .map(normalizeImportedCollection)
    .sort((a, b) => a.name.localeCompare(b.name));

  return normalizedRow.every(
    (rowCollection, index) =>
      rowCollection.name === normalizedExisting[index]?.name &&
      rowCollection.description === normalizedExisting[index]?.description
  );
}

function getCollectionDiffs(
  rowCollections: ImportResultRow["collections"],
  existingCollections?: ExistingSermonInfo["collections"]
) {
  const normalizeName = (value?: string | null) => value?.trim().toLowerCase() ?? "";
  const stripName = (value?: string | null) => value?.trim() ?? "";

  const rowMap = new Map<string, string>();
  for (const collection of rowCollections) {
    const normalized = normalizeName(collection.name);
    if (!normalized) continue;
    rowMap.set(normalized, stripName(collection.name));
  }

  const existingMap = new Map<string, string>();
  for (const collection of existingCollections ?? []) {
    const normalized = normalizeName(collection?.name);
    if (!normalized) continue;
    existingMap.set(normalized, stripName(collection?.name));
  }

  const added: string[] = [];
  for (const [key, displayName] of rowMap) {
    if (!existingMap.has(key)) {
      added.push(displayName);
    }
  }

  const removed: string[] = [];
  for (const [key, displayName] of existingMap) {
    if (!rowMap.has(key)) {
      removed.push(displayName);
    }
  }

  return { added, removed };
}

function getSpeakerDiff(
  row: ImportResultRow,
  existing: ExistingSermonInfo
) {
  const normalize = (value?: string | null) => value?.trim() ?? "";
  const before = normalize(existing.speaker).toLowerCase();
  const after = normalize(row.speaker).toLowerCase();
  if (before === after) return null;
  return {
    before: existing.speaker ?? null,
    after: row.speaker,
  };
}

function getTitleDiff(
  row: ImportResultRow,
  existing: ExistingSermonInfo
) {
  const normalize = (value?: string | null) => value?.trim() ?? "";
  const before = normalize(existing.event_title).toLowerCase();
  const after = normalize(row.event_title).toLowerCase();
  if (before === after) return null;
  return {
    before: existing.event_title ?? null,
    after: row.event_title,
  };
}

function hasChanges(row: ImportResultRow, existing: ExistingSermonInfo) {
  const normalize = (value?: string | null) => value?.trim() ?? "";
  const titleChanged =
    row.event_title.trim().toLowerCase() !== normalize(existing.event_title).toLowerCase();
  const startChanged = row.event_start_time !== (existing.start_time ?? "");
  const endChanged = row.event_end_time !== (existing.end_time ?? "");
  const speakerChanged =
    row.speaker.trim().toLowerCase() !== normalize(existing.speaker).toLowerCase();
  const collectionsChanged = !collectionsEqual(
    row.collections,
    existing.collections
  );

  return (
    titleChanged ||
    startChanged ||
    endChanged ||
    speakerChanged ||
    collectionsChanged
  );
}

/** Annotate rows that should reuse an existing sermon rather than inserting new entries. */
async function markExistingSermons(
  rows: ImportResultRow[]
): Promise<ImportResultRow[]> {
  if (!rows.length) return rows;

  const range = getTimeRange(rows);
  if (!range) return rows;

  const { data: events, error } = await fetchEventsWithSermons(
    range.min,
    range.max
  );

  if (error || !events?.length) return rows;

  const existingMap = buildExistingMap(events);
  if (!existingMap.size) return rows;

  return rows.map((row) => {
    if (row.status !== ImportStatus.Nieuw) return row;
    const key = createSermonKey(row.event_start_time);
    const existing = existingMap.get(key);
    if (!existing) return row;
    const diffs = getCollectionDiffs(row.collections, existing.collections);
    const changesDetected = hasChanges(row, existing);
    if (!changesDetected) {
      return {
        ...row,
        status: ImportStatus.Overgeslagen,
        message:
          row.message ??
          "De gegevens zijn gelijk aan de bestaande preek. Import wordt overgeslagen.",
      };
    }
    return {
      ...row,
      status: ImportStatus.Bestaand,
      message:
        row.message ??
        "Er bestaat al een preek op dit tijdstip.",
      event_id: existing.event_id,
      sermon_id: existing.sermon_id,
      collectionDiffs: diffs,
      speakerDiff: getSpeakerDiff(row, existing) ?? undefined,
      titleDiff: getTitleDiff(row, existing) ?? undefined,
    };
  });
}

export function checkSermonRows(rows: ImportRow[]): Promise<ImportResultRow[]> {
  const validated = validateSermonRows(rows);
  return markExistingSermons(validated);
}

export async function importSermonRows(
  rows: ImportRow[]
): Promise<ImportResultRow[]> {
  const validated = await checkSermonRows(rows);
  const results: ImportResultRow[] = [];

  for (const row of validated) {
    if (row.status === ImportStatus.Nieuw) {
      try {
        const eventId = await insertEvent(row);
        const sermonId = await insertSermon(eventId, row);
        await insertCollections(sermonId, row);

        results.push({
          ...row,
          status: ImportStatus.Aangemaakt,
          message: "Preek succesvol geïmporteerd.",
        });
      } catch (error) {
        console.error("Import row failed:", error);
        results.push({
          ...row,
          status: ImportStatus.Fout,
          message:
            (error instanceof Error ? error.message : String(error)) ??
            "Onbekende fout.",
        });
      }
      continue;
    }

    if (row.status === ImportStatus.Bestaand) {
      try {
        await updateExistingSermon(row);
        results.push({
          ...row,
          status: ImportStatus.Hergebruikt,
          message: "Bestaande preek is bijgewerkt met de nieuwe gegevens.",
        });
      } catch (error) {
        console.error("Update existing sermon failed:", error);
        results.push({
          ...row,
          status: ImportStatus.Fout,
          message:
            (error instanceof Error ? error.message : String(error)) ??
            "Bestaande preek kon niet worden bijgewerkt.",
        });
      }
      continue;
    }

    results.push(row);
  }

  return results;
}

async function insertEvent(row: ImportResultRow) {
  const { data, error } = await supabaseClient
    .from("events")
    .insert({
      title: row.event_title || "Onbekende dienst",
      start_time: row.event_start_time,
      end_time: row.event_end_time,
    })
    .select("id")
    .single();

  if (error || !data?.id)
    throw error ?? new Error("Event kon niet worden aangemaakt.");
  return data.id;
}

async function insertSermon(eventId: string, row: ImportResultRow) {
  const { data, error } = await supabaseClient
    .from("sermons")
    .insert({
      event_id: eventId,
      speaker: row.speaker || "Onbekende spreker",
    })
    .select("id")
    .single();

  if (error || !data?.id)
    throw error ?? new Error("Preek kon niet worden aangemaakt.");
  return data.id;
}

async function insertCollections(sermonId: string, row: ImportResultRow) {
  if (!row.collections.length) return;

  const payload = row.collections.map((collection) => ({
    sermon_id: sermonId,
    name: collection.name,
    description: collection.description || null,
  }));

  const { error } = await supabaseClient.from("collections").insert(payload);
  if (error) throw error;
}

async function updateExistingSermon(row: ImportResultRow) {
  if (!row.event_id || !row.sermon_id) {
    throw new Error("Bestaande preek kon niet worden gevonden.");
  }

  await updateEvent(row.event_id, row);
  await updateSermon(row.sermon_id, row);

  await syncCollections(row.sermon_id, row);
}

async function updateEvent(eventId: string, row: ImportResultRow) {
  const { error } = await supabaseClient
    .from("events")
    .update({
      title: row.event_title || "Onbekende dienst",
      start_time: row.event_start_time,
      end_time: row.event_end_time,
    })
    .eq("id", eventId)
    .select();

  if (error) throw error;
}

async function updateSermon(sermonId: string, row: ImportResultRow) {
  const { error } = await supabaseClient
    .from("sermons")
    .update({
      speaker: row.speaker || "Onbekende spreker",
    })
    .eq("id", sermonId)
    .select();

  if (error) throw error;
}

async function syncCollections(sermonId: string, row: ImportResultRow) {
  const { data: existingCollections, error } = await supabaseClient
    .from("collections")
    .select("id, name, description")
    .eq("sermon_id", sermonId);

  if (error) throw error;

  const existingByName = new Map<
    string,
    { id: string; description: string | null }
  >();
  for (const collection of existingCollections ?? []) {
    if (!collection?.id || !collection?.name) continue;
    existingByName.set(
      collection.name.trim().toLowerCase(),
      {
        id: collection.id,
        description: collection.description,
      }
    );
  }

  const processedKeys = new Set<string>();
  for (const collection of row.collections) {
    const trimmedName = collection.name?.trim();
    if (!trimmedName) continue;
    const key = trimmedName.toLowerCase();
    const description = collection.description?.trim() || null;
    const existing = existingByName.get(key);

    if (existing) {
      processedKeys.add(key);
      if (existing.description !== description) {
        const { error: updateError } = await supabaseClient
          .from("collections")
          .update({ description })
          .eq("id", existing.id);
        if (updateError) throw updateError;
      }
      continue;
    }

    const { error: insertError } = await supabaseClient.from("collections").insert({
      sermon_id: sermonId,
      name: trimmedName,
      description,
    });
    if (insertError) throw insertError;
  }

  for (const [key, existing] of existingByName) {
    if (processedKeys.has(key)) continue;
    const { error: deleteError } = await supabaseClient
      .from("collections")
      .delete()
      .eq("id", existing.id);
    if (deleteError) throw deleteError;
  }
}
