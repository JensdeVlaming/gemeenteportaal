import { listSermonsWithRelations } from "@/services/sermonService";
import type { Collection, Event, Sermon } from "@/types/types";
import { useCallback, useEffect, useState } from "react";

export type SermonFull = Sermon & {
  event: Event;
  collections: Collection[];
};

export function useSermons() {
  const [sermons, setSermons] = useState<SermonFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSermons = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const data = await listSermonsWithRelations();
      setSermons(data);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "Er ging iets mis bij het ophalen van preken.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSermons(true);
  }, [fetchSermons]);

  const refresh = useCallback(async () => {
    await fetchSermons(false);
  }, [fetchSermons]);

  return { sermons, loading, error, refresh };
}
