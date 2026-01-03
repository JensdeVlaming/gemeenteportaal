import { getSession } from "@/services/authService";
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
  const session = await getSession();
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/${endpoint}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ sermons: rows }),
    }
  );

  const result: SermonFunctionResponse & { error?: string } =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error ?? defaultError);
  }

  if (!result.results) {
    throw new Error("Ongeldig serverantwoord.");
  }

  return result.results;
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
