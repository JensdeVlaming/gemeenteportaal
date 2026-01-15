import type {
  Collection,
  CollectionInsert,
  CollectionUpdate,
  Event,
  EventInsert,
  EventUpdate,
  Sermon,
  SermonUpdate,
} from "@/types/types";

export type PocketBaseEvent = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime: string;
  endTime: string;
  created?: string | null;
  updated?: string | null;
};

export type PocketBaseSermon = {
  id: string;
  event: string;
  speaker: string;
  created?: string | null;
  updated?: string | null;
};

export type PocketBaseCollection = {
  id: string;
  sermon: string;
  name: string;
  description?: string | null;
  created?: string | null;
  updated?: string | null;
};

export function mapEvent(record: PocketBaseEvent): Event {
  return {
    id: record.id,
    title: record.title,
    description: record.description ?? null,
    location: record.location ?? null,
    start_time: record.startTime,
    end_time: record.endTime,
    created_at: record.created ?? null,
    updated_at: record.updated ?? null,
  };
}

export function mapSermon(record: PocketBaseSermon): Sermon {
  return {
    id: record.id,
    event_id: record.event,
    speaker: record.speaker,
    created_at: record.created ?? null,
  };
}

export function mapCollection(record: PocketBaseCollection): Collection {
  return {
    id: record.id,
    sermon_id: record.sermon,
    name: record.name,
    description: record.description ?? null,
    created_at: record.created ?? null,
  };
}

export function toPocketBaseEventPayload(
  payload: EventInsert | EventUpdate
) {
  const { start_time, end_time, ...rest } = payload;

  return {
    ...rest,
    ...(start_time ? { startTime: start_time } : {}),
    ...(end_time ? { endTime: end_time } : {}),
  };
}

export function toPocketBaseSermonPayload(payload: Partial<SermonUpdate>) {
  const { event_id, ...rest } = payload;
  return {
    ...rest,
    ...(event_id ? { event: event_id } : {}),
  };
}

export function toPocketBaseCollectionPayload(
  payload: CollectionInsert | Partial<CollectionUpdate>
) {
  const { sermon_id, ...rest } = payload;
  return {
    ...rest,
    ...(sermon_id ? { sermon: sermon_id } : {}),
  };
}
