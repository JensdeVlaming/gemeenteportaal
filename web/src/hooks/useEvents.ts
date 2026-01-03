import { listEvents } from "@/services/eventService";
import type { EventFull } from "@/types/types";
import { useCallback, useEffect, useState } from "react";

export function useEvents() {
  const [events, setEvents] = useState<EventFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(
    async (showLoader = false) => {
      if (showLoader) setLoading(true);
      try {
        const data = await listEvents();
        setEvents(data);
        setError(null);
      } catch (err: any) {
        setError(err.message ?? "Er ging iets mis bij het ophalen van events.");
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchEvents(true);
  }, [fetchEvents]);

  const refresh = useCallback(async () => {
    await fetchEvents(false);
  }, [fetchEvents]);

  return { events, loading, error, refresh };
}
