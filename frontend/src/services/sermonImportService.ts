import { pbRequest } from "@/lib/pocketbaseClient";
import { ImportStatus, type ParsedSermonRow } from "@/types/sermonImport";
import { parseDutyElderCsv } from "@/utils/dutyElderCsv";
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
    duty_elder: "",
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
    if (file.name.toLowerCase().endsWith(".csv")) {
      const dutyElderRows = await parseDutyElderCsv(file);
      parsed = dutyElderRows.map((row) => ({
        import_mode: "duty_elder",
        event_title: "",
        event_start_time: row.event_start_time,
        event_end_time: "",
        speaker: "",
        duty_elder: row.duty_elder,
        collections: [],
      }));
    } else {
      parsed = await parseSermonsExcel(file);
    }
  } catch (err) {
    return [
      emptyRow(
        ImportStatus.Fout,
        err instanceof Error
          ? err.message
          : "Fout bij het inlezen van het importbestand."
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
