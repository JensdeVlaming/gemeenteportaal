import type { Database } from "./database";

export type Event = Database["public"]["Tables"]["events"]["Row"];
export type Sermon = Database["public"]["Tables"]["sermons"]["Row"];
export type Collection = Database["public"]["Tables"]["collections"]["Row"];

export type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
export type SermonInsert = Database["public"]["Tables"]["sermons"]["Insert"];
export type CollectionInsert =
  Database["public"]["Tables"]["collections"]["Insert"];
export type EventUpdate = Database["public"]["Tables"]["events"]["Update"];
export type SermonUpdate = Database["public"]["Tables"]["sermons"]["Update"];
export type CollectionUpdate =
  Database["public"]["Tables"]["collections"]["Update"];

export type EventFull = Event & {
  sermons: (Sermon & { collections: Collection[] })[];
  type: "sermon" | "activity";
};
