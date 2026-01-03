import { Button } from "@/components/Button";
import AddSermonModal from "@/components/sermon/AddSermonModal";
import SermonList from "@/components/sermon/SermonList";
import { useSermons } from "@/hooks/useSermons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Sermons() {
  const navigate = useNavigate();
  const { sermons, loading, error, refresh } = useSermons();
  const [manualModalOpen, setManualModalOpen] = useState(false);

  return (
    <main className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Preken</h2>
          <p className="text-sm text-gray-500 mt-1">
            Bekijk de bestaande preken. Wil je een Excel importeren? Gebruik dan
            de speciale importpagina.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => setManualModalOpen(true)}
          >
            Preek toevoegen
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={() => navigate("/sermons/import")}
          >
            Naar importpagina
          </Button>
        </div>
      </div>

      {/* Existing sermons list */}
      <section>
        <SermonList
          sermons={sermons}
          loading={loading}
          error={error}
          onRefresh={refresh}
        />
      </section>

      <AddSermonModal
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onCreated={refresh}
      />
    </main>
  );
}
