import { Button } from "@/components/Button";
import clsx from "clsx";
import { deleteEvent, updateEvent } from "@/services/eventService";
import {
  createCollection,
  deleteCollection,
  updateCollection,
  updateSermon,
} from "@/services/sermonService";
import type { EventFull, EventUpdate } from "@/types/types";
import { X } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

interface EditEventModalProps {
  open: boolean;
  event: EventFull | null;
  onClose: () => void;
  onUpdated?: () => Promise<void> | void;
  onDeleted?: () => Promise<void> | void;
}

const defaultFormState = {
  title: "",
  description: "",
  location: "",
  start: "",
  end: "",
};

function toLocalDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offsetMs);
  return localDate.toISOString().slice(0, 16);
}

function mapEventToForm(event: EventFull) {
  return {
    title: event.title,
    description: event.description ?? "",
    location: event.location ?? "",
    start: toLocalDateTime(event.start_time),
    end: toLocalDateTime(event.end_time),
  };
}

interface SermonCollectionForm {
  key: string;
  id?: string;
  name: string;
  description: string;
}

function createCollectionKey() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function EditEventModal({
  open,
  event,
  onClose,
  onUpdated,
  onDeleted,
}: EditEventModalProps) {
  useLayoutEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const [formState, setFormState] = useState(defaultFormState);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sermonSpeaker, setSermonSpeaker] = useState("");
  const [sermonCollections, setSermonCollections] = useState<
    SermonCollectionForm[]
  >([]);
  const [deletedCollectionIds, setDeletedCollectionIds] = useState<string[]>(
    []
  );
  const [sermonError, setSermonError] = useState<string | null>(null);

  const sermon = event?.sermons?.[0] ?? null;
  const isSermon = Boolean(sermon);

  useEffect(() => {
    if (open && event) {
      setFormState(mapEventToForm(event));
      setError(null);
      const sermonRecord = event.sermons?.[0];
      if (sermonRecord) {
        setSermonSpeaker(sermonRecord.speaker ?? "");
        setSermonCollections(
          (sermonRecord.collections ?? []).map((collection) => ({
            key: collection.id,
            id: collection.id,
            name: collection.name,
            description: collection.description ?? "",
          }))
        );
        setDeletedCollectionIds([]);
        setSermonError(null);
      } else {
        setSermonSpeaker("");
        setSermonCollections([]);
        setDeletedCollectionIds([]);
        setSermonError(null);
      }
    } else if (!open) {
      setFormState(defaultFormState);
      setSubmitting(false);
      setDeleting(false);
      setError(null);
      setSermonSpeaker("");
      setSermonCollections([]);
      setDeletedCollectionIds([]);
      setSermonError(null);
    }
  }, [open, event]);

  if (!open || !event) return null;

  const handleChange =
    (field: keyof typeof formState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (eventSubmit: FormEvent<HTMLFormElement>) => {
    eventSubmit.preventDefault();
    setError(null);

    if (!formState.title.trim()) {
      setError("Vul een titel in.");
      return;
    }

    if (!formState.start || !formState.end) {
      setError("Vul zowel start- als eindtijd in.");
      return;
    }

    const startDate = new Date(formState.start);
    const endDate = new Date(formState.end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError("Gebruik een geldige datum en tijd.");
      return;
    }

    if (endDate <= startDate) {
      setError("De eindtijd moet later zijn dan de starttijd.");
      return;
    }

    const payload: EventUpdate = {
      title: formState.title.trim(),
      description: formState.description.trim()
        ? formState.description.trim()
        : null,
      location: formState.location.trim() ? formState.location.trim() : null,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
    };

    setSubmitting(true);
    try {
      await updateEvent(event.id, payload);
      if (isSermon) {
        const sermonSaved = await saveSermonData();
        if (!sermonSaved) {
          return;
        }
      }
      await onUpdated?.();
      onClose();
    } catch (err: any) {
      setError(
        err?.message ?? "Het bijwerken van de activiteit is niet gelukt."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;

    const confirmed = window.confirm(
      "Weet je zeker dat je deze activiteit wilt verwijderen?"
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await deleteEvent(event.id);
      await onDeleted?.();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Het verwijderen is niet gelukt.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCollectionChange =
    (key: string, field: "name" | "description") =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSermonCollections((prev) =>
        prev.map((collection) =>
          collection.key === key
            ? { ...collection, [field]: event.target.value }
            : collection
        )
      );
    };

  const handleAddCollection = () => {
    setSermonCollections((prev) => [
      ...prev,
      { key: createCollectionKey(), name: "", description: "" },
    ]);
  };

  const handleRemoveCollection = (key: string, id?: string) => {
    setSermonCollections((prev) =>
      prev.filter((collection) => collection.key !== key)
    );
    if (id) {
      setDeletedCollectionIds((prev) =>
        Array.from(new Set([...prev, id]))
      );
    }
  };

  const saveSermonData = async () => {
    if (!sermon) return true;
    setSermonError(null);

    if (!sermonSpeaker.trim()) {
      setSermonError("Vul de naam van de voorganger in.");
      return false;
    }

    if (sermonCollections.some((collection) => !collection.name.trim())) {
      setSermonError("Geef elke collectedoel een naam.");
      return false;
    }

    try {
      await updateSermon(sermon.id, { speaker: sermonSpeaker.trim() });

      const requests: Promise<unknown>[] = [];

      if (deletedCollectionIds.length > 0) {
        requests.push(
          ...deletedCollectionIds.map((collectionId) =>
            deleteCollection(collectionId)
          )
        );
      }

      for (const collection of sermonCollections) {
        const trimmedName = collection.name.trim();
        const trimmedDescription = collection.description.trim();
        if (collection.id) {
          requests.push(
            updateCollection(collection.id, {
              name: trimmedName,
              description: trimmedDescription ? trimmedDescription : null,
            })
          );
        } else {
          requests.push(
            createCollection({
              sermon_id: sermon.id,
              name: trimmedName,
              description: trimmedDescription ? trimmedDescription : null,
            })
          );
        }
      }

      await Promise.all(requests);
      setDeletedCollectionIds([]);
      return true;
    } catch (err: any) {
      setSermonError(
        err?.message ?? "Het opslaan van de preekgegevens is niet gelukt."
      );
      return false;
    }
  };

  const formClass = clsx(
    "rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5",
    isSermon
      ? "max-h-[calc(100vh-3.5rem)] min-h-0 overflow-y-auto"
      : "max-w-[min(640px,100%)] mx-auto"
  );

  const form = (
    <form className={formClass} onSubmit={handleSubmit}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Activiteit aanpassen
          </h2>
          <p className="text-sm text-gray-500">
            Werk de details bij of verwijder de activiteit.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E98C00]"
          aria-label="Sluiten"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Naam</label>
        <input
          type="text"
          value={formState.title}
          onChange={handleChange("title")}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#E98C00] focus:outline-none focus:ring-1 focus:ring-[#E98C00]"
          placeholder="Bijv. Jongerendienst"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Startmoment
          </label>
            <input
              type="datetime-local"
              value={formState.start}
              onChange={handleChange("start")}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#E98C00] focus:outline-none focus:ring-1 focus:ring-[#E98C00]"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Eindmoment
          </label>
            <input
              type="datetime-local"
              value={formState.end}
              onChange={handleChange("end")}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#E98C00] focus:outline-none focus:ring-1 focus:ring-[#E98C00]"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Locatie</label>
        <input
          type="text"
          value={formState.location}
          onChange={handleChange("location")}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#E98C00] focus:outline-none focus:ring-1 focus:ring-[#E98C00]"
          placeholder="Bijv. Grote Kerk, Kampen"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Beschrijving
        </label>
        <textarea
          value={formState.description}
          onChange={handleChange("description")}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#E98C00] focus:outline-none focus:ring-1 focus:ring-[#E98C00]"
          placeholder="Optionele beschrijving van de activiteit"
          rows={3}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting || deleting}
          >
            Annuleren
          </Button>
          <Button
            type="button"
            variant="neutral"
            className="border-red-200 text-red-600 hover:bg-red-50 focus:ring-red-200"
            onClick={handleDelete}
            disabled={submitting}
            loading={deleting}
          >
            Verwijderen
          </Button>
        </div>
        <Button type="submit" loading={submitting}>
          Opslaan
        </Button>
      </div>
    </form>
  );

  const sermonPanel = (
    <aside className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4 max-h-[calc(100vh-3.5rem)] min-h-0 overflow-y-auto">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Preekgegevens</h3>
        <p className="text-sm text-gray-500">
          Pas de voorganger en collectedoelen aan.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Voorganger
        </label>
        <input
          type="text"
          value={sermonSpeaker}
          onChange={(event) => setSermonSpeaker(event.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#E98C00] focus:outline-none focus:ring-1 focus:ring-[#E98C00]"
          placeholder="Naam van de voorganger"
        />
      </div>

      <div className="space-y-4">
        {sermonCollections.map((collection, index) => (
          <div
            key={collection.key}
            className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                Collectedoel {index + 1}
              </p>
              <button
                type="button"
                className="text-sm font-medium text-red-600 hover:text-red-500"
                onClick={() => handleRemoveCollection(collection.key, collection.id)}
              >
                Verwijderen
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Naam
              </label>
              <input
                type="text"
                value={collection.name}
                onChange={handleCollectionChange(collection.key, "name")}
                className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-[#E98C00] focus:outline-none focus:ring-1 focus:ring-[#E98C00]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Beschrijving
              </label>
              <textarea
                value={collection.description}
                onChange={handleCollectionChange(collection.key, "description")}
                className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-[#E98C00] focus:outline-none focus:ring-1 focus:ring-[#E98C00]"
                rows={2}
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white/50 px-3 py-2 text-sm font-medium text-gray-700 hover:border-[#E98C00] hover:text-[#E98C00]"
          onClick={handleAddCollection}
        >
          Collectedoel toevoegen
        </button>
      </div>

      {sermonError && (
        <p className="text-sm text-red-600" role="alert">
          {sermonError}
        </p>
      )}

    </aside>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          "w-full rounded-2xl p-0 shadow-none",
          isSermon
            ? "max-w-6xl max-h-[calc(100vh-2rem)] overflow-hidden"
            : "max-w-lg"
        )}
      >
        <div
          onClick={(event) => event.stopPropagation()}
          className={clsx(
            "grid gap-6",
            isSermon
              ? "items-start lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]"
              : "justify-center"
          )}
        >
          {isSermon ? (
            <>
              {form}
              {sermonPanel}
            </>
          ) : (
            form
          )}
        </div>
      </div>
    </div>
  );
}
