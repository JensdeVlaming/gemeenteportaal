# ICS feed endpoint

Gemeenteportaal exposes an iCalendar feed for church app integrations.

## Endpoint

- `GET /api/calendar/app.ics`

Optional token protection:

- Set `ICS_FEED_TOKEN` in environment.
- Use the URL as `/api/calendar/app.ics?token=<value>`.

If no token is set, the endpoint is public.

## Event mapping

- `SUMMARY`: event title (`events.title`)
- `LOCATION`: `events.location` or `ICS_DEFAULT_LOCATION`
- `DTSTART` / `DTEND`: UTC timestamps based on `startTime` / `endTime`
- `DESCRIPTION`: plain text church-service details
- `X-ALT-DESC;FMTTYPE=text/html`: HTML variant for richer clients

When an event has related sermon data, the feed includes:

- Speaker (`sermons.speaker`)
- Collections (`collections.name` and optional `collections.description`)
- Optional livestream/liturgy links via env vars

## Environment variables

- `ICS_FEED_TOKEN` (optional)
- `ICS_CALENDAR_NAME` (default: `Gemeenteportaal`)
- `ICS_UID_DOMAIN` (default: `gemeenteportaal.local`)
- `ICS_DEFAULT_LOCATION` (default: `De Wijnstok`)
- `ICS_LIVESTREAM_URL` (optional)
- `ICS_LITURGY_URL` (optional)

## Notes for reuse in another project

To reuse the architecture in another backend:

1. Keep a dedicated event fetcher that returns title, start/end, location, and sermon metadata.
2. Keep the iCalendar serializer pure (escaping + folding + CRLF output).
3. Keep the HTTP handler thin (auth + headers + serializer response).
