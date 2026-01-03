import { Button } from "@/components/Button";
import { useSermons } from "@/hooks/useSermons";
import {
  exportSermonTemplate,
  exportSermonsToExcel,
} from "@/utils/excelSermonUtils";
import { useRef } from "react";
import type { ChangeEvent } from "react";

export function ImportHeader({
  onUpload,
  sermons,
  loading,
  disabled,
}: {
  onUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  sermons: ReturnType<typeof useSermons>["sermons"];
  loading: boolean;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // manually open file dialog
  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
      <Button variant="secondary" onClick={() => exportSermonTemplate()}>
        Download template
      </Button>

      <Button
        onClick={() => exportSermonsToExcel(sermons)}
        disabled={loading || disabled || !sermons?.length}
      >
        Exporteer preken
      </Button>

      {/* hidden input, triggered manually */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={onUpload}
        disabled={disabled}
      />

      <Button
        variant="secondary"
        onClick={handleUploadClick}
        disabled={disabled}
      >
        Upload Excel
      </Button>
    </div>
  );
}
