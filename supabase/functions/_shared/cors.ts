const DEFAULT_ORIGIN =
  Deno.env.get("CORS_ALLOW_ORIGIN") ?? "https://portaal.pkndubbeldam.nl";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": DEFAULT_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

export function corsPreflightResponse() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}
