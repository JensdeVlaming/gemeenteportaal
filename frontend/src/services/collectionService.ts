import { pbListAll } from "@/lib/pocketbaseClient";
import {
  mapCollection,
  type PocketBaseCollection,
} from "@/services/pocketbaseMappers";
import type { Collection } from "@/types/types";

/** List all collections + number of sermons using each */
export async function listCollectionsWithUsage() {
  const data = await pbListAll<PocketBaseCollection>("collections");

  const countMap = new Map<string, { c: Collection; count: number }>();

  for (const row of data ?? []) {
    const mapped = mapCollection(row);
    const id = mapped.id;
    if (!countMap.has(id)) {
      countMap.set(id, { c: mapped, count: 1 });
    } else {
      const curr = countMap.get(id)!;
      curr.count += 1;
      countMap.set(id, curr);
    }
  }

  return Array.from(countMap.values()).map(({ c, count }) => ({
    ...c,
    sermon_count: count,
  }));
}
