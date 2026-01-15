import { useSermonImport } from "@/hooks/useSermonImport";
import { useSermons } from "@/hooks/useSermons";
import {
  ImportStatus,
  ImportStep,
  type ParsedSermonRow,
} from "@/types/sermonImport";
import clsx from "clsx";
import type { ChangeEvent, ReactNode } from "react";
import { Button } from "../Button";
import { Loader } from "../Loader";
import { ImportHeader } from "./ImportHeader";
import { ImportPreviewTable } from "./ImportPreviewTable";

export default function SermonImport() {
  const { sermons, loading: sermonsLoading, refresh } = useSermons();
  const {
    rows,
    loading,
    step,
    error,
    handleFileUpload,
    confirmImport,
    resetImport,
    canImport,
  } = useSermonImport({ onImported: refresh });

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const fileInput = e.target;
    const file = fileInput.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
    fileInput.value = "";
  }

  const isIdle = step === ImportStep.Idle;
  const isPreview = step === ImportStep.Preview && rows.length > 0;
  const isImporting = step === ImportStep.Importing;
  const isDone = step === ImportStep.Done;
  const showTable = (isPreview || isDone) && rows.length > 0;

  return (
    <section className="space-y-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Preken importeren
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Upload het Excel-sjabloon of exporteer de huidige preken. Tijdens de
            preview kun je controleren welke rijen worden geïmporteerd.
          </p>
        </div>

        <ImportHeader
          onUpload={handleFile}
          sermons={sermons}
          loading={sermonsLoading}
          disabled={isImporting || loading}
        />
      </div>

      <StepIndicator step={step} />

      {error && <StatusBanner variant="error">{error}</StatusBanner>}

      {loading && (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white">
          <Loader label="Excel aan het verwerken…" />
        </div>
      )}

      {!loading && isIdle && <IdleState />}

      {showTable && (
        <div className="space-y-3">
          <ImportSummary rows={rows} />
          <ImportPreviewTable rows={rows} />
        </div>
      )}

      {isDone && (
        <StatusBanner variant="success">
          Import voltooid! De nieuwe preken zijn toegevoegd.
        </StatusBanner>
      )}

      <ImportActionBar
        step={step}
        canImport={canImport}
        isImporting={isImporting}
        hasRows={rows.length > 0}
        onConfirm={confirmImport}
        onReset={resetImport}
      />
    </section>
  );
}

function IdleState() {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600 shadow-sm">
      <p className="font-medium text-gray-800">Nog geen bestand geselecteerd</p>
      <p>
        Download het template of kies &ldquo;Upload Excel&rdquo; om een
        voorvertoning te zien voordat je importeert.
      </p>
    </div>
  );
}

function StepIndicator({ step }: { step: ImportStep }) {
  const steps = [
    {
      id: ImportStep.Idle,
      label: "Bestand kiezen",
      description: "Selecteer het Excel-bestand",
    },
    {
      id: ImportStep.Preview,
      label: "Controle",
      description: "Controleer de gegevens voordat je importeert",
    },
    {
      id: ImportStep.Importing,
      label: "Importeren",
      description: "Stuur de gegevens naar de server",
    },
    {
      id: ImportStep.Done,
      label: "Klaar",
      description: "Resultaten bekijken",
    },
  ];

  const currentIndex = steps.findIndex((s) => s.id === step);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <ol className="flex flex-wrap gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-sm">
      {steps.map((item, index) => {
        const isComplete = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <li key={item.id} className="flex items-center gap-3">
            <span
              className={clsx(
                "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                isComplete
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : isActive
                  ? "border-indigo-600 bg-white text-indigo-700"
                  : "border-gray-200 bg-gray-100 text-gray-500"
              )}
            >
              {isComplete ? "✓" : index + 1}
            </span>
            <div>
              <p
                className={clsx(
                  "font-medium",
                  isActive ? "text-gray-900" : "text-gray-500"
                )}
              >
                {item.label}
              </p>
              <p className="text-xs text-gray-400">{item.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ImportSummary({ rows }: { rows: ParsedSermonRow[] }) {
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    const status = row.status ?? ImportStatus.Nieuw;
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});

  if (!Object.keys(counts).length) return null;

  const order: ImportStatus[] = [
    ImportStatus.Aangemaakt,
    ImportStatus.Nieuw,
    ImportStatus.Bestaand,
    ImportStatus.Hergebruikt,
    ImportStatus.Dubbel,
    ImportStatus.Ongeldig,
    ImportStatus.Fout,
    ImportStatus.Leeg,
    ImportStatus.Overgeslagen,
  ];

  const summaryClasses = (status: string) => {
    switch (status) {
      case ImportStatus.Nieuw:
      case ImportStatus.Aangemaakt:
        return "bg-green-50 text-green-700 border-green-100";
      case ImportStatus.Bestaand:
      case ImportStatus.Hergebruikt:
        return "bg-blue-50 text-blue-700 border-blue-100";
      case ImportStatus.Dubbel:
        return "bg-purple-50 text-purple-700 border-purple-100";
      case ImportStatus.Ongeldig:
      case ImportStatus.Fout:
        return "bg-red-50 text-red-700 border-red-100";
      case ImportStatus.Leeg:
      case ImportStatus.Overgeslagen:
        return "bg-gray-50 text-gray-600 border-gray-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const displayStatuses = [
    ...order,
    ...Object.keys(counts).filter(
      (status) => !order.includes(status as ImportStatus)
    ),
  ].filter((status, index, array) => array.indexOf(status) === index);

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {displayStatuses
        .filter((status) => counts[status])
        .map((status) => (
          <span
            key={status}
            className={clsx(
              "rounded-full border px-3 py-1 font-medium",
              summaryClasses(status)
            )}
          >
            {status} <span className="font-semibold">{counts[status]}</span>
          </span>
        ))}
    </div>
  );
}

function ImportActionBar({
  step,
  canImport,
  isImporting,
  hasRows,
  onConfirm,
  onReset,
}: {
  step: ImportStep;
  canImport: boolean;
  isImporting: boolean;
  hasRows: boolean;
  onConfirm: () => void;
  onReset: () => void;
}) {
  if (!hasRows && step === ImportStep.Idle) return null;

  let helperText = "Upload een Excel-bestand om te beginnen.";
  if (step === ImportStep.Preview) {
    helperText = canImport
      ? "Alles ziet er goed uit. Klik op Bevestig import om verder te gaan."
      : "Los eerst de foutmeldingen op voordat je importeert.";
  } else if (step === ImportStep.Importing) {
    helperText = "De import wordt uitgevoerd. Even geduld…";
  } else if (step === ImportStep.Done) {
    helperText = "Klaar! Start een nieuwe import of controleer de resultaten.";
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-gray-600">{helperText}</p>
      <div className="flex flex-wrap justify-end gap-2">
        {(step === ImportStep.Preview || step === ImportStep.Done) && (
          <Button variant="secondary" onClick={onReset} disabled={isImporting}>
            {step === ImportStep.Done ? "Nieuwe import" : "Annuleer"}
          </Button>
        )}

        {step === ImportStep.Preview && (
          <Button onClick={onConfirm} disabled={!canImport || isImporting}>
            Bevestig import
          </Button>
        )}

        {step === ImportStep.Importing && (
          <Button disabled className="cursor-wait">
            Bezig met import…
          </Button>
        )}
      </div>
    </div>
  );
}

function StatusBanner({
  variant,
  children,
}: {
  variant: "success" | "error";
  children: ReactNode;
}) {
  const styles =
    variant === "success"
      ? "bg-green-50 border-green-200 text-green-800"
      : "bg-red-50 border-red-200 text-red-700";

  return (
    <p
      className={clsx(
        "rounded-md border px-4 py-3 text-sm font-medium",
        styles
      )}
    >
      {children}
    </p>
  );
}
