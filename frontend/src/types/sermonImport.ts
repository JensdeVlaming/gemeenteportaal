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

export const ImportStep = {
  Idle: "idle",
  Preview: "preview",
  Importing: "importing",
  Done: "done",
} as const;

export type ImportStep = (typeof ImportStep)[keyof typeof ImportStep];

export type ParsedCollection = {
  name: string;
  description?: string;
};

export type ParsedSermonRow = {
  event_title: string;
  event_start_time: string;
  event_end_time: string;
  speaker: string;
  collections: ParsedCollection[];
  status?: ImportStatus;
  message?: string;
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
