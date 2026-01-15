import { pbListAll, pbRequest } from "@/lib/pocketbaseClient";
import {
  mapCollection,
  mapEvent,
  mapSermon,
  toPocketBaseCollectionPayload,
  toPocketBaseSermonPayload,
  type PocketBaseCollection,
  type PocketBaseEvent,
  type PocketBaseSermon,
} from "@/services/pocketbaseMappers";
import type {
  Collection,
  CollectionInsert,
  CollectionUpdate,
  Event,
  Sermon,
  SermonFull,
  SermonUpdate,
} from "@/types/types";

/** List all sermons with related event + collections */
export async function listSermonsWithRelations(): Promise<SermonFull[]> {
  const [events, sermons, collections] = await Promise.all([
    pbListAll<PocketBaseEvent>("events"),
    pbListAll<PocketBaseSermon>("sermons"),
    pbListAll<PocketBaseCollection>("collections"),
  ]);

  const eventMap = new Map(
    events.map((event) => [event.id, mapEvent(event)])
  );
  const collectionsBySermon = new Map<string, ReturnType<typeof mapCollection>[]>();

  for (const collection of collections) {
    const mapped = mapCollection(collection);
    const list = collectionsBySermon.get(mapped.sermon_id) ?? [];
    list.push(mapped);
    collectionsBySermon.set(mapped.sermon_id, list);
  }

  const mappedSermons = sermons.map((sermon) => {
    const mapped = mapSermon(sermon);
    return {
      ...mapped,
      event: eventMap.get(mapped.event_id),
      collections: collectionsBySermon.get(mapped.id) ?? [],
    };
  });

  const hasEvent = (
    sermon: Sermon & { event?: Event | null; collections: Collection[] }
  ): sermon is SermonFull => Boolean(sermon.event);

  return mappedSermons.filter(hasEvent).sort((a, b) => {
    const left = new Date(a.event.start_time).getTime();
    const right = new Date(b.event.start_time).getTime();
    return left - right;
  });
}

export async function updateSermon(id: string, payload: Partial<SermonUpdate>) {
  const data = await pbRequest<PocketBaseSermon>(
    `/api/collections/sermons/records/${id}`,
    {
      method: "PATCH",
      body: toPocketBaseSermonPayload(payload),
    }
  );

  return mapSermon(data);
}

export async function createCollection(payload: CollectionInsert) {
  await pbRequest<PocketBaseCollection>("/api/collections/collections/records", {
    method: "POST",
    body: toPocketBaseCollectionPayload(payload),
  });
}

export async function updateCollection(
  id: string,
  payload: Partial<CollectionUpdate>
) {
  await pbRequest<PocketBaseCollection>(
    `/api/collections/collections/records/${id}`,
    {
      method: "PATCH",
      body: toPocketBaseCollectionPayload(payload),
    }
  );
}

export async function deleteCollection(id: string) {
  await pbRequest(`/api/collections/collections/records/${id}`, {
    method: "DELETE",
  });
}
