import { checkSermonRows } from "../_shared/sermon-import.ts";
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
    if (!Array.isArray(sermons)) {
      return jsonResponse({ error: "Geen data ontvangen" }, 400);
    }

    const results = await checkSermonRows(sermons);

    return jsonResponse({ results });
  } catch (error) {
    console.error("Sermon check error:", error);
    return jsonResponse({ error: "Serverfout bij controle." }, 500);
  }
});
