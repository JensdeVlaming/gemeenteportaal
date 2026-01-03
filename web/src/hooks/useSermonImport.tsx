import {
  loadSermonsFromFile,
  runSermonImport,
} from "@/services/sermonImportService";
import {
  ImportStatus,
  ImportStep,
  type ParsedSermonRow,
} from "@/types/sermonImport";
import { useState } from "react";

/**
 * useSermonImport
 * - Leest Excel in (client-side)
 * - Valideert basale structuur
 * - Stuurt naar edge function voor batch import
 */
type UseSermonImportOptions = {
  onImported?: () => Promise<void> | void;
};

export function useSermonImport(options?: UseSermonImportOptions) {
  const [rows, setRows] = useState<ParsedSermonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<ImportStep>(ImportStep.Idle);
  const [error, setError] = useState<string | null>(null);

  /** ⬆️ Upload & parse Excel */
  async function handleFileUpload(file: File) {
    setLoading(true);
    setError(null);
    try {
      const validatedRows = await loadSermonsFromFile(file);
      setRows(validatedRows);
      setStep(ImportStep.Preview);
    } catch (err) {
      console.error("Import parse error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Kon het Excel-bestand niet verwerken."
      );
    } finally {
      setLoading(false);
    }
  }

  /** ✅ Bevestig import via Edge Function */
  async function confirmImport() {
    setError(null);
    setStep(ImportStep.Importing);

    try {
      const results = await runSermonImport(rows);
      setRows(results);
      if (options?.onImported) {
        await options.onImported();
      }
      setStep(ImportStep.Done);
    } catch (err) {
      console.error("Import function error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Import mislukt. Controleer het bestand en probeer opnieuw."
      );
      setStep(ImportStep.Preview);
    }
  }

  function resetImport() {
    setRows([]);
    setStep(ImportStep.Idle);
    setError(null);
  }

  const hasInvalidRows = rows.some((row) =>
    [ImportStatus.Ongeldig, ImportStatus.Fout, ImportStatus.Leeg].includes(
      row.status as ImportStatus
    )
  );

  const canImport = rows.length > 0 && !hasInvalidRows;

  return {
    rows,
    loading,
    step,
    error,
    handleFileUpload,
    confirmImport,
    resetImport,
    canImport,
  };
}
