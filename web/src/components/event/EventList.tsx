import { Button } from "@/components/Button";
import { useEvents } from "@/hooks/useEvents";
import type { EventFull } from "@/types/types";
import { useState } from "react";
import { Loader } from "../Loader";
import { AddEventModal } from "./AddEventModal";
import { EditEventModal } from "./EditEventModal";
import { EventCard } from "./EventCard";

export default function EventList() {
  const { events, loading, error, refresh } = useEvents();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventFull | null>(null);

  const handleEventsChanged = async () => {
    await refresh();
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader label="Agenda items worden geladen…" />
      </div>
    );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Agenda</h2>
          {error ? (
            <p className="text-sm text-red-600 mt-1">{error}</p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">
              Voeg handmatig activiteiten toe naast de diensten.
            </p>
          )}
        </div>
        <Button onClick={() => setModalOpen(true)}>Activiteit toevoegen</Button>
      </div>

      {events?.length ? (
        <section
          aria-label="Lijst van diensten"
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onSelect={() => setSelectedEvent(event)}
            />
          ))}
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center shadow-sm">
          <p className="text-gray-600">Geen geplande diensten gevonden.</p>
          <Button className="mt-4" onClick={() => setModalOpen(true)}>
            Maak eerste activiteit
          </Button>
        </div>
      )}

      <AddEventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleEventsChanged}
      />
      <EditEventModal
        open={Boolean(selectedEvent)}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onUpdated={handleEventsChanged}
        onDeleted={handleEventsChanged}
      />
    </>
  );
}
