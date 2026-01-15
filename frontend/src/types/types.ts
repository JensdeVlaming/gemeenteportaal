export type Event = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  created_at: string | null;
  updated_at?: string | null;
};

export type Sermon = {
  id: string;
  event_id: string;
  speaker: string;
  created_at: string | null;
};

export type Collection = {
  id: string;
  sermon_id: string;
  name: string;
  description: string | null;
  created_at: string | null;
};

export type EventInsert = {
  title: string;
  description?: string | null;
  location?: string | null;
  start_time: string;
  end_time: string;
};

export type SermonInsert = {
  event_id: string;
  speaker: string;
};

export type CollectionInsert = {
  sermon_id: string;
  name: string;
  description?: string | null;
};

export type EventUpdate = Partial<EventInsert>;
export type SermonUpdate = Partial<SermonInsert>;
export type CollectionUpdate = Partial<CollectionInsert>;

export type EventFull = Event & {
  sermons: (Sermon & { collections: Collection[] })[];
  type: "sermon" | "activity";
};

export type SermonFull = Sermon & {
  event: Event;
  collections: Collection[];
};
