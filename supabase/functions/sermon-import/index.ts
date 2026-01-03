import { importSermonRows } from "../_shared/sermon-import.ts";
import { corsPreflightResponse, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { sermons } = await req.json();
    if (!Array.isArray(sermons) || !sermons.length) {
      return jsonResponse({ error: "Geen data ontvangen" }, 400);
    }

    const results = await importSermonRows(sermons);

    return jsonResponse({ results });
  } catch (error) {
    console.error(
      "Import function error:",
      error instanceof Error ? error.message : String(error)
    );
    return jsonResponse({ error: "Serverfout bij import." }, 500);
  }
});
