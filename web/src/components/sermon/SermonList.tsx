import { Loader } from "@/components/Loader";
import type { SermonFull } from "@/hooks/useSermons";
import type { EventFull } from "@/types/types";
import { useMemo, useState } from "react";
import { EditEventModal } from "../event/EditEventModal";
import { EventCard } from "../event/EventCard";

function mapSermonToEventFull(sermon: SermonFull): EventFull {
  const { event, ...sermonData } = sermon;
  return {
    ...event,
    type: "sermon",
    sermons: [
      {
        ...sermonData,
        collections: sermon.collections,
      },
    ],
  };
}

interface SermonListProps {
  sermons: SermonFull[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
}

export default function SermonList({
  sermons,
  loading,
  error,
  onRefresh,
}: SermonListProps) {
  const [selectedEvent, setSelectedEvent] = useState<EventFull | null>(null);
  const enrichedEvents = useMemo(() => sermons.map(mapSermonToEventFull), [
    sermons,
  ]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader label="Preken laden…" />
      </div>
    );

  if (error) return <p className="text-center text-red-600 py-10">{error}</p>;

  if (!sermons?.length)
    return (
      <p className="text-center text-gray-500 py-10">Geen preken gevonden.</p>
    );

  const handleSermonsChanged = async () => {
    await onRefresh();
  };

  return (
    <>
      <section
        aria-label="Lijst van preken"
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {enrichedEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onSelect={() => setSelectedEvent(event)}
          />
        ))}
      </section>
      <EditEventModal
        open={Boolean(selectedEvent)}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onUpdated={handleSermonsChanged}
        onDeleted={handleSermonsChanged}
      />
    </>
  );
}
