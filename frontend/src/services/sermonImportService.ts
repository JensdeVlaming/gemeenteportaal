import { pbRequest } from "@/lib/pocketbaseClient";
import { ImportStatus, type ParsedSermonRow } from "@/types/sermonImport";
import { parseSermonsExcel } from "@/utils/excelSermonUtils";

type SermonFunctionResponse = {
  results?: ParsedSermonRow[];
};

function emptyRow(status: ImportStatus, message: string): ParsedSermonRow {
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

async function callSermonFunction(
  endpoint: "sermon-check" | "sermon-import",
  rows: ParsedSermonRow[],
  defaultError: string
) {
  try {
    const data = await pbRequest<
      SermonFunctionResponse & { error?: string }
    >(`/api/${endpoint}`, {
      method: "POST",
      body: { sermons: rows },
    });

    if (data?.error) {
      throw new Error(data.error);
    }

    if (!data?.results) {
      throw new Error("Ongeldig serverantwoord.");
    }

    return data.results;
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }

    throw new Error(defaultError);
  }
}

export async function loadSermonsFromFile(file: File) {
  let parsed: ParsedSermonRow[];
  try {
    parsed = await parseSermonsExcel(file);
  } catch {
    return [
      emptyRow(
        ImportStatus.Fout,
        "Fout bij het inlezen van het Excel-bestand."
      ),
    ];
  }

  return callSermonFunction(
    "sermon-check",
    parsed,
    "Controle mislukt. Probeer het later opnieuw."
  );
}

export async function runSermonImport(rows: ParsedSermonRow[]) {
  const results = await callSermonFunction(
    "sermon-import",
    rows,
    "Import mislukt. Server gaf een foutmelding terug."
  );
  return results;
}
