import { pbListAll, pbListPage, pbRequest } from "@/lib/pocketbaseClient";
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
import { startOfTodayIso } from "@/utils/date";

type EventPage = {
  items: EventFull[];
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
};

export type EventPageMode = "upcoming" | "past";

function buildOrFilter(field: string, values: string[]) {
  return values.map((value) => `${field}="${value}"`).join(" || ");
}

/** List events from today with sermons and collections included */
export async function listEventsPage(
  page: number,
  perPage: number,
  mode: EventPageMode
): Promise<EventPage> {
  const todayIso = startOfTodayIso();
  const isPast = mode === "past";

  const response = await pbListPage<PocketBaseEvent>("events", {
    page: String(page),
    perPage: String(perPage),
    sort: isPast ? "-startTime" : "startTime",
    filter: isPast
      ? `startTime < "${todayIso}"`
      : `startTime >= "${todayIso}"`,
  });

  const pageEvents = response?.items ?? [];
  if (pageEvents.length === 0) {
    return {
      items: [],
      page: response?.page ?? page,
      perPage: response?.perPage ?? perPage,
      totalPages: response?.totalPages ?? 1,
      totalItems: response?.totalItems ?? 0,
    };
  }

  const orderedEvents = isPast ? [...pageEvents].reverse() : pageEvents;
  const eventIds = orderedEvents.map((event) => event.id);
  const sermonFilter = buildOrFilter("event", eventIds);

  const sermons = await pbListAll<PocketBaseSermon>("sermons", {
    filter: sermonFilter,
  });

  const sermonMap = new Map(
    sermons.map((sermon) => [sermon.id, mapSermon(sermon)])
  );
  const sermonIds = Array.from(sermonMap.keys());
  const collections = sermonIds.length
    ? await pbListAll<PocketBaseCollection>("collections", {
        filter: buildOrFilter("sermon", sermonIds),
      })
    : [];

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

  const items = orderedEvents.map((event) => {
    const mappedEvent = mapEvent(event);
    const eventSermons = sermonsByEvent.get(mappedEvent.id) ?? [];
    const type: EventFull["type"] =
      eventSermons.length > 0 ? "sermon" : "activity";
    return {
      ...mappedEvent,
      sermons: eventSermons,
      type,
    };
  });

  return {
    items,
    page: response?.page ?? page,
    perPage: response?.perPage ?? perPage,
    totalPages: response?.totalPages ?? 1,
    totalItems: response?.totalItems ?? items.length,
  };
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
