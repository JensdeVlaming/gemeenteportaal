import { importSermonRows } from "../_shared/sermon-import.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { sermons } = await req.json();
    if (!Array.isArray(sermons) || !sermons.length) {
      return new Response(JSON.stringify({ error: "Geen data ontvangen" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const results = await importSermonRows(sermons);

    return new Response(JSON.stringify({ results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(
      "Import function error:",
      error instanceof Error ? error.message : String(error)
    );
    return new Response(JSON.stringify({ error: "Serverfout bij import." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
