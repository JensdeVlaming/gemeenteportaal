import { listCollectionsWithUsage } from "@/services/collectionService";
import type { Collection } from "@/types/types";
import { useEffect, useState } from "react";

export type CollectionWithUsage = Collection & { sermon_count: number };

export function useCollections() {
  const [collections, setCollections] = useState<CollectionWithUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await listCollectionsWithUsage();
        setCollections(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { collections, loading, error };
}
