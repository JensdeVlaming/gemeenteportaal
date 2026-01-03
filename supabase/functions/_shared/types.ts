export const ImportStatus = {
  Nieuw: "Nieuwe rij",
  Bestaand: "Wordt geüpdatet",
  Fout: "Fout",
  Leeg: "Leeg",
  Ongeldig: "Ongeldig",
  Dubbel: "Dubbel",
  Overgeslagen: "Overgeslagen",
  Aangemaakt: "Aangemaakt",
  Hergebruikt: "Hergebruikt",
} as const;
export type ImportStatus = (typeof ImportStatus)[keyof typeof ImportStatus];

export type ImportCollection = {
  name?: string | null;
  description?: string | null;
};

export type ImportRow = {
  event_title?: string | null;
  event_start_time?: string | null;
  event_end_time?: string | null;
  speaker?: string | null;
  collections?: ImportCollection[] | null;
  status?: ImportStatus;
  message?: string | null;
};

export type ImportResultRow = Omit<ImportRow, "collections"> & {
  status: ImportStatus;
  message?: string | null;
  collections: { name: string; description?: string | null }[];
  event_title: string;
  event_start_time: string;
  event_end_time: string;
  speaker: string;
  event_id?: string;
  sermon_id?: string;
  collectionDiffs?: {
    added: string[];
    removed: string[];
  };
  speakerDiff?: {
    before?: string | null;
    after?: string | null;
  };
  titleDiff?: {
    before?: string | null;
    after?: string | null;
  };
};
