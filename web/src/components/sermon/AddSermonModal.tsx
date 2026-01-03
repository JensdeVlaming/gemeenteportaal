import { Button } from "@/components/Button";
import { runSermonImport } from "@/services/sermonImportService";
import {
  ImportStatus,
  type ParsedCollection,
  type ParsedSermonRow,
} from "@/types/sermonImport";
import { X } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useState,
} from "react";

interface AddSermonModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
}

interface CollectionForm {
  key: string;
  name: string;
  description: string;
}

function createFormState() {
  return {
    title: "",
    start: "",
    end: "",
    speaker: "",
    collections: [] as CollectionForm[],
  };
}

function createCollectionKey() {
  return `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toIsoString(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

export default function AddSermonModal({
  open,
  onClose,
  onCreated,
}: AddSermonModalProps) {
  const [form, setForm] = useState(createFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setForm(createFormState());
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  const collectionCount = form.collections.length;

  const handleChange =
    (field: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleCollectionChange =
    (key: string, field: "name" | "description") =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({
        ...prev,
        collections: prev.collections.map((collection) =>
          collection.key === key ? { ...collection, [field]: value } : collection
        ),
      }));
    };

  const handleAddCollection = () => {
    setForm((prev) => ({
      ...prev,
      collections: [
        ...prev.collections,
        { key: createCollectionKey(), name: "", description: "" },
      ],
    }));
  };

  const handleRemoveCollection = (key: string) => {
    setForm((prev) => ({
      ...prev,
      collections: prev.collections.filter(
        (collection) => collection.key !== key
      ),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError("Vul een titel in.");
      return;
    }

    if (!form.start || !form.end) {
      setError("Vul zowel start- als eindtijd in.");
      return;
    }

    const startDate = new Date(form.start);
    const endDate = new Date(form.end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setError("Gebruik een geldige datum en tijd.");
      return;
    }

    if (endDate <= startDate) {
      setError("De eindtijd moet later zijn dan de starttijd.");
      return;
    }

    if (!form.speaker.trim()) {
      setError("Geef de naam van de voorganger op.");
      return;
    }

    if (form.collections.some((collection) => !collection.name.trim())) {
      setError("Geef elke collectedoel een naam.");
      return;
    }

    const parsedCollections: ParsedCollection[] = form.collections
      .map((collection) => {
        const trimmedDescription = collection.description.trim();
        return {
          name: collection.name.trim(),
          description: trimmedDescription ? trimmedDescription : undefined,
        };
      })
      .filter((collection) => collection.name);

    const row: ParsedSermonRow = {
      event_title: form.title.trim(),
      event_start_time: toIsoString(form.start),
      event_end_time: toIsoString(form.end),
      speaker: form.speaker.trim(),
      collections: parsedCollections,
    };

    setSubmitting(true);
    try {
      const results = await runSermonImport([row]);
      const result = results?.[0];
      const isFinalizedStatus = (
        status?: ImportStatus
      ): status is
        | typeof ImportStatus.Aangemaakt
        | typeof ImportStatus.Hergebruikt =>
        status === ImportStatus.Aangemaakt ||
        status === ImportStatus.Hergebruikt;

      if (!result || !isFinalizedStatus(result.status)) {
        throw new Error(
          result?.message ?? "Helaas kon de preek niet worden toegevoegd."
        );
      }
      await onCreated?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Het toevoegen van de preek is niet gelukt."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[calc(100vh-2rem)] overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Preek toevoegen
              </h2>
              <p className="text-sm text-gray-500">
                Voeg een dienst + voorganger handmatig toe zonder Excel.
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

          <form
            className="space-y-5 overflow-y-auto px-6 py-5"
            style={{ maxHeight: "calc(100vh - 6rem)" }}
            onSubmit={handleSubmit}
          >
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Titel
            </label>
            <input
              type="text"
              value={form.title}
              onChange={handleChange("title")}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#E98C00] focus:outline-none focus:ring-1 focus:ring-[#E98C00]"
              placeholder="Bijv. Zondagsdienst"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Start
              </label>
              <input
                type="datetime-local"
                value={form.start}
                onChange={handleChange("start")}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#E98C00] focus:outline-none focus:ring-1 focus:ring-[#E98C00]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Eind
              </label>
              <input
                type="datetime-local"
                value={form.end}
                onChange={handleChange("end")}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#E98C00] focus:outline-none focus:ring-1 focus:ring-[#E98C00]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Voorganger
            </label>
            <input
              type="text"
              value={form.speaker}
              onChange={handleChange("speaker")}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#E98C00] focus:outline-none focus:ring-1 focus:ring-[#E98C00]"
              placeholder="Naam van de voorganger"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                Collectedoelen ({collectionCount})
              </p>
              <button
                type="button"
                className="text-sm font-medium text-[#E98C00] hover:text-[#c76d00]"
                onClick={handleAddCollection}
              >
                Collectedoel toevoegen
              </button>
            </div>
            {form.collections.map((collection, index) => (
              <div
                key={collection.key}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Doel {index + 1}
                  </p>
                  <button
                    type="button"
                    className="text-xs font-medium text-red-600 hover:text-red-500"
                    onClick={() => handleRemoveCollection(collection.key)}
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
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600">
                    Beschrijving (optioneel)
                  </label>
                  <textarea
                    value={collection.description}
                    onChange={handleCollectionChange(
                      collection.key,
                      "description"
                    )}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-[#E98C00] focus:outline-none focus:ring-1 focus:ring-[#E98C00]"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Annuleren
            </Button>
            <Button type="submit" loading={submitting}>
              Preek opslaan
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
  );
}
