import { listEventsPage, type EventPageMode } from "@/services/eventService";
import type { EventFull } from "@/types/types";
import { useCallback, useEffect, useState } from "react";

type UseEventsOptions = {
  perPage?: number;
  initialPage?: number;
  initialMode?: EventPageMode;
};

export function useEvents({
  perPage = 12,
  initialPage = 1,
  initialMode = "upcoming",
}: UseEventsOptions = {}) {
  const [events, setEvents] = useState<EventFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [mode, setMode] = useState<EventPageMode>(initialMode);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchEvents = useCallback(
    async (showLoader = false) => {
      if (showLoader) setLoading(true);
      try {
        const data = await listEventsPage(page, perPage, mode);
        setEvents(data.items);
        setTotalPages(data.totalPages);
        setTotalItems(data.totalItems);
        setError(null);
      } catch (err: any) {
        setError(err.message ?? "Er ging iets mis bij het ophalen van events.");
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [page, perPage, mode]
  );

  useEffect(() => {
    fetchEvents(true);
  }, [fetchEvents]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const refresh = useCallback(async () => {
    await fetchEvents(false);
  }, [fetchEvents]);

  const switchMode = useCallback((nextMode: EventPageMode) => {
    setMode(nextMode);
    setPage(1);
  }, []);

  const nextPage = useCallback(() => {
    if (mode === "past") {
      if (page > 1) {
        setPage((prev) => Math.max(1, prev - 1));
      } else {
        switchMode("upcoming");
      }
      return;
    }

    setPage((prev) => Math.min(totalPages, prev + 1));
  }, [mode, page, totalPages, switchMode]);

  const prevPage = useCallback(() => {
    if (mode === "upcoming") {
      if (page > 1) {
        setPage((prev) => Math.max(1, prev - 1));
      } else {
        switchMode("past");
      }
      return;
    }

    setPage((prev) => Math.min(totalPages, prev + 1));
  }, [mode, page, totalPages, switchMode]);

  const isEmpty = totalItems === 0 && !loading && !error;
  const canPrev =
    mode === "past" ? !isEmpty && page < totalPages : !loading;
  const canNext =
    mode === "past" ? !loading : !isEmpty && page < totalPages;

  return {
    events,
    loading,
    error,
    refresh,
    page,
    perPage,
    totalPages,
    totalItems,
    mode,
    setPage,
    nextPage,
    prevPage,
    canPrev,
    canNext,
  };
}
