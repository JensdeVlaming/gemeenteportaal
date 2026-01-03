import clsx from "clsx";
import type { EventFull } from "@/types/types";
import type { KeyboardEvent } from "react";
import { Calendar, Clock, HandCoins, MapPin, User } from "lucide-react";

interface EventCardProps {
  event: EventFull;
  onSelect?: (event: EventFull) => void;
  className?: string;
}

export function EventCard({ event, onSelect, className }: EventCardProps) {
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);

  const formattedDate = start.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const startTime = start.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isSermon = event.sermons && event.sermons.length > 0;
  const accentColor = isSermon
    ? "from-[#E98C00] via-[#fbbf24] to-[#E98C00]"
    : "from-[#9a3412] via-[#c2410c] to-[#ea580c]";

  const handleKeyDown = (eventKey: KeyboardEvent<HTMLArticleElement>) => {
    if (onSelect && (eventKey.key === "Enter" || eventKey.key === " ")) {
      eventKey.preventDefault();
      onSelect(event);
    }
  };

  return (
    <article
      tabIndex={0}
      role={onSelect ? "button" : undefined}
      onClick={onSelect ? () => onSelect(event) : undefined}
      onKeyDown={onSelect ? handleKeyDown : undefined}
      className={clsx(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#E98C00] transition",
        className
      )}
    >
      {/* Accent gradient */}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-0 h-full w-1.5 bg-linear-to-b ${accentColor} rounded-r`}
      />

      <div className="flex flex-col gap-3 p-5">
        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-900 group-hover:text-[#E98C00] transition-colors">
          {event.title}
        </h2>

        {/* Date / time / location */}
        <div className="flex flex-col gap-1 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#E98C00]" />
            <span className="capitalize">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#E98C00]" />
            <span>
              {startTime} – {endTime}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#E98C00]" />
              <span>{event.location}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-gray-700 leading-relaxed mt-1">
            {event.description}
          </p>
        )}

        {/* Sermons (if any) */}
        {isSermon && (
          <div className="mt-4 border-t border-gray-100 pt-3 space-y-4">
            {event.sermons.map((sermon) => (
              <div key={sermon.id}>
                {/* Speaker */}
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <User className="h-4 w-4 text-[#E98C00]" />
                  <span>
                    <span className="font-semibold">Voorganger:</span>{" "}
                    {sermon.speaker}
                  </span>
                </div>

                {/* Collections */}
                {sermon.collections?.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-1">
                      <HandCoins className="h-4 w-4 text-[#E98C00]" />
                      <span>Collectedoelen</span>
                    </div>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {sermon.collections.map((c) => (
                        <li key={c.id}>
                          <span className="font-medium">{c.name}</span>
                          {c.description && (
                            <span className="text-gray-500">
                              {" "}
                              – {c.description}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
