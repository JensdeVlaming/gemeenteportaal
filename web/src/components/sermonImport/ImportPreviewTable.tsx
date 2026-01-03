import { ImportStatus, type ParsedSermonRow } from "@/types/sermonImport";
import clsx from "clsx";

/**
 * Toon de geïmporteerde preken in tabelvorm
 * inclusief datum, tijd, spreker, collectes en status.
 */
export function ImportPreviewTable({ rows }: { rows: ParsedSermonRow[] }) {
  if (!rows.length) return null;

  function formatDateTime(start: string, end: string) {
    if (!start) return "—";

    const startDate = new Date(start);
    const date = startDate.toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const startTime = startDate.toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const endTime = end
      ? new Date(end).toLocaleTimeString("nl-NL", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

    return `${date} – ${startTime}${endTime ? ` tot ${endTime}` : ""}`;
  }

  function statusColor(status: ImportStatus) {
    switch (status) {
      case ImportStatus.Nieuw:
        return "text-green-600";
      case ImportStatus.Bestaand:
        return "text-[#E98C00]";
      case ImportStatus.Ongeldig:
      case ImportStatus.Fout:
        return "text-red-600";
      case ImportStatus.Dubbel:
        return "text-purple-600";
      case ImportStatus.Aangemaakt:
        return "text-blue-600";
      case ImportStatus.Leeg:
        return "text-gray-500";
      default:
        return "text-gray-700";
    }
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
      <table className="min-w-full text-sm text-left border-collapse">
        <thead className="bg-gray-50 text-gray-700 font-semibold">
          <tr>
            <th className="p-2">Datum & tijd</th>
            <th className="p-2">Titel</th>
            <th className="p-2">Spreker</th>
            <th className="p-2">Collectes</th>
            <th className="p-2">Status</th>
            <th className="p-2">Melding</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr
              key={idx}
              className="border-t hover:bg-gray-50 transition-colors"
            >
              <td className="p-2 whitespace-nowrap">
                {formatDateTime(r.event_start_time, r.event_end_time)}
              </td>
              <td className="p-2">
                {r.event_title || "—"}
                {r.titleDiff && (
                  <p className="mt-1 text-xs text-orange-600">
                    {r.titleDiff.before ?? "—"} → {r.titleDiff.after ?? "—"}
                  </p>
                )}
              </td>
              <td className="p-2">
                {r.speaker || "—"}
                {r.speakerDiff ? (
                  <p className="mt-1 text-xs text-orange-600">
                    {r.speakerDiff.before ?? "—"} → {r.speakerDiff.after ?? "—"}
                  </p>
                ) : null}
              </td>
              <td className="p-2">
                {r.collections?.length
                  ? r.collections.map((c) => c.name).join(", ")
                  : "Geen"}
                {r.collectionDiffs?.added?.length ? (
                  <p className="mt-1 text-xs text-green-600">
                    Toegevoegd: {r.collectionDiffs.added.join(", ")}
                  </p>
                ) : null}
                {r.collectionDiffs?.removed?.length ? (
                  <p className="mt-1 text-xs text-red-600">
                    Verwijderd: {r.collectionDiffs.removed.join(", ")}
                  </p>
                ) : null}
              </td>
              <td
                className={clsx(
                  "p-2 font-medium",
                  r.status ? statusColor(r.status) : undefined
                )}
              >
                {r.status ?? "—"}
              </td>
              <td className="p-2 text-gray-600 text-xs">{r.message ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
