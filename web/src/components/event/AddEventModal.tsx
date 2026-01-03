import { Button } from "@/components/Button";
import { createEvent } from "@/services/eventService";
import type { EventInsert } from "@/types/types";
import { X } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  useEffect,
  useState,
} from "react";

interface AddEventModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
}

const defaultFormState = {
  title: "",
  description: "",
  location: "",
  start: "",
  end: "",
};

export function AddEventModal({ open, onClose, onCreated }: AddEventModalProps) {
  const [form, setForm] = useState(defaultFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setForm(defaultFormState);
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleChange =
    (field: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
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

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError("Gebruik een geldige datum en tijd.");
      return;
    }

    if (endDate <= startDate) {
      setError("De eindtijd moet later zijn dan de starttijd.");
      return;
    }

    const payload: EventInsert = {
      title: form.title.trim(),
      description: form.description.trim() ? form.description.trim() : null,
      location: form.location.trim() ? form.location.trim() : null,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
    };

    setSubmitting(true);
    try {
      await createEvent(payload);
      await onCreated?.();
      onClose();
    } catch (err: any) {
      setError(
        err?.message ?? "Het toevoegen van de activiteit is niet gelukt."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Activiteit toevoegen
            </h2>
            <p className="text-sm text-gray-500">
              Plan een normale activiteit zonder preek.
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

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Naam
            </label>
            <input
              type="text"
              value={form.title}
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
                value={form.start}
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
                value={form.end}
                onChange={handleChange("end")}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#E98C00] focus:outline-none focus:ring-1 focus:ring-[#E98C00]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Locatie
            </label>
            <input
              type="text"
              value={form.location}
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
              value={form.description}
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

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Annuleren
            </Button>
            <Button type="submit" loading={submitting}>
              Activiteit opslaan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
