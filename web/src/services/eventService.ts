import { supabase } from "@/lib/supabaseClient";
import type { EventFull, EventInsert, EventUpdate } from "@/types/types";

const EVENT_WITH_RELATIONS = `
  *,
  sermons:sermons (
    id,
    event_id,
    speaker,
    created_at,
    collections:collections (
      id,
      sermon_id,
      name,
      description,
      created_at
    )
  )
`;

function mapEvent(record: any): EventFull {
  return {
    ...record,
    type: record.sermons?.length > 0 ? "sermon" : "activity",
  };
}

/** List all events with sermons and collections included */
export async function listEvents() {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_WITH_RELATIONS)
    .order("start_time", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((event) => mapEvent(event));
}

export async function createEvent(payload: EventInsert) {
  const { data, error } = await supabase
    .from("events")
    .insert(payload)
    .select(EVENT_WITH_RELATIONS)
    .single();

  if (error) throw error;

  return mapEvent(data);
}

export async function updateEvent(id: string, payload: EventUpdate) {
  const { data, error } = await supabase
    .from("events")
    .update(payload)
    .eq("id", id)
    .select(EVENT_WITH_RELATIONS)
    .single();

  if (error) throw error;

  return mapEvent(data);
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}
