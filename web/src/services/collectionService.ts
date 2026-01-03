import { supabase } from "@/lib/supabaseClient";
import type { Collection } from "@/types/types";

/** List all collections + number of sermons using each */
export async function listCollectionsWithUsage() {
  const { data, error } = await supabase.from("collections").select(`
      id,
      sermon_id,
      name,
      description,
      created_at,
      sermon:sermons!inner(id)
    `);

  if (error) throw error;

  const countMap = new Map<string, { c: Collection; count: number }>();

  for (const row of data ?? []) {
    const id = row.id;
    if (!countMap.has(id)) {
      countMap.set(id, {
        c: {
          id: row.id,
          sermon_id: row.sermon_id,
          name: row.name,
          description: row.description,
          created_at: row.created_at,
        },
        count: 1,
      });
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
