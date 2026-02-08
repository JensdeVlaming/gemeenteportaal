import { Button } from "@/components/Button";
import { Loader } from "@/components/Loader";
import { EventCard } from "@/components/event/EventCard";
import { useEvents } from "@/hooks/useEvents";
import clsx from "clsx";

type CalendarLayout = "grid" | "stack";

interface CalendarEmbedViewProps {
  itemsPerPage?: number;
  layout?: CalendarLayout;
  showPager?: boolean;
  className?: string;
  noEventsLabel?: string;
}

export function CalendarEmbedView({
  itemsPerPage = 8,
  layout = "grid",
  showPager = false,
  className,
  noEventsLabel,
}: CalendarEmbedViewProps) {
  const perPage = Math.max(1, itemsPerPage);
  const {
    events,
    loading,
    error,
    page,
    totalItems,
    nextPage,
    prevPage,
    canPrev,
    canNext,
  } = useEvents({ perPage });
  const startIndex = (page - 1) * perPage;
  const pageEvents = events;
  const hasPager = showPager;
  const isEmpty = !loading && !error && totalItems === 0;
  const layoutClasses =
    layout === "stack"
      ? "flex flex-col gap-4"
      : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <main
      className={clsx(
        "min-h-screen w-full bg-transparent text-gray-900",
        className
      )}
    >
      <section className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:py-12">
        {loading && (
          <Loader
            label="Agenda items worden geladen…"
            className="min-h-[220px]"
          />
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Kon de agenda niet ophalen. Probeer het later opnieuw.
          </div>
        )}

        {!loading && !error && isEmpty && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-6 text-center text-sm text-gray-600">
            {noEventsLabel ?? "Er zijn nog geen agenda-items beschikbaar."}
          </div>
        )}

        {!loading && !error && !isEmpty && (
          <>
            <div className={layoutClasses}>
              {pageEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {!loading &&
              layout === "grid" &&
              totalItems > 0 && (
              <p className="text-center text-sm text-gray-500">
                Toont {startIndex + 1}–{startIndex + pageEvents.length} van{" "}
                {totalItems} geplande items.
              </p>
            )}
          </>
        )}

        {hasPager && (
          <div className="flex justify-center gap-3 text-sm text-gray-500">
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="primary"
                className="px-6 py-3 text-base font-semibold shadow-lg shadow-[#E98C00]/60"
                onClick={prevPage}
                disabled={!canPrev}
              >
                Vorige
              </Button>
              <Button
                type="button"
                variant="primary"
                className="px-6 py-3 text-base font-semibold shadow-lg shadow-[#E98C00]/60"
                onClick={nextPage}
                disabled={!canNext}
              >
                Volgende
              </Button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
