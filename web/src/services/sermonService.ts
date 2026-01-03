import { supabase } from "@/lib/supabaseClient";
import type {
  CollectionInsert,
  CollectionUpdate,
  SermonUpdate,
} from "@/types/types";

/** List all sermons with related event + collections */
export async function listSermonsWithRelations() {
  const { data, error } = await supabase
    .from("sermons")
    .select(
      `
      *,
      event:events (
        id,
        title,
        description,
        location,
        start_time,
        end_time
      ),
      collections:collections (
        id,
        name,
        description,
        created_at
      )
    `
    )
    .order("event(start_time)", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function updateSermon(id: string, payload: Partial<SermonUpdate>) {
  const { data, error } = await supabase
    .from("sermons")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createCollection(payload: CollectionInsert) {
  const { error } = await supabase.from("collections").insert(payload);
  if (error) throw error;
}

export async function updateCollection(
  id: string,
  payload: Partial<CollectionUpdate>
) {
  const { error } = await supabase
    .from("collections")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCollection(id: string) {
  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) throw error;
}
