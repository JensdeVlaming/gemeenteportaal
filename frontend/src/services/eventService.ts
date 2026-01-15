import { pbListAll, pbRequest } from "@/lib/pocketbaseClient";
import {
  mapCollection,
  mapEvent,
  mapSermon,
  toPocketBaseEventPayload,
  type PocketBaseCollection,
  type PocketBaseEvent,
  type PocketBaseSermon,
} from "@/services/pocketbaseMappers";
import type { EventFull, EventInsert, EventUpdate } from "@/types/types";

/** List all events with sermons and collections included */
export async function listEvents(): Promise<EventFull[]> {
  const [events, sermons, collections] = await Promise.all([
    pbListAll<PocketBaseEvent>("events", { sort: "startTime" }),
    pbListAll<PocketBaseSermon>("sermons"),
    pbListAll<PocketBaseCollection>("collections"),
  ]);

  const eventMap = new Map(
    events.map((event) => [event.id, mapEvent(event)])
  );
  const sermonMap = new Map(
    sermons.map((sermon) => [sermon.id, mapSermon(sermon)])
  );
  const collectionsBySermon = new Map<string, ReturnType<typeof mapCollection>[]>();

  for (const collection of collections) {
    const mapped = mapCollection(collection);
    const list = collectionsBySermon.get(mapped.sermon_id) ?? [];
    list.push(mapped);
    collectionsBySermon.set(mapped.sermon_id, list);
  }

  const sermonsByEvent = new Map<string, EventFull["sermons"]>();
  for (const sermon of sermonMap.values()) {
    const list = sermonsByEvent.get(sermon.event_id) ?? [];
    list.push({
      ...sermon,
      collections: collectionsBySermon.get(sermon.id) ?? [],
    });
    sermonsByEvent.set(sermon.event_id, list);
  }

  return Array.from(eventMap.values()).map((event) => {
    const eventSermons = sermonsByEvent.get(event.id) ?? [];
    return {
      ...event,
      sermons: eventSermons,
      type: eventSermons.length > 0 ? "sermon" : "activity",
    };
  });
}

export async function createEvent(payload: EventInsert) {
  const data = await pbRequest<PocketBaseEvent>(
    "/api/collections/events/records",
    {
      method: "POST",
      body: toPocketBaseEventPayload(payload),
    }
  );

  return {
    ...mapEvent(data),
    sermons: [],
    type: "activity",
  };
}

export async function updateEvent(id: string, payload: EventUpdate) {
  const data = await pbRequest<PocketBaseEvent>(
    `/api/collections/events/records/${id}`,
    {
      method: "PATCH",
      body: toPocketBaseEventPayload(payload),
    }
  );

  return {
    ...mapEvent(data),
    sermons: [],
    type: "activity",
  };
}

export async function deleteEvent(id: string) {
  await pbRequest(`/api/collections/events/records/${id}`, {
    method: "DELETE",
  });
}
