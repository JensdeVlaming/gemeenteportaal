import { FileText, HandCoins } from "lucide-react";

interface CollectionCardProps {
  collection: {
    id: string;
    name: string;
    description: string | null;
    sermon_count: number;
  };
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const { id, name, description, sermon_count } = collection;

  return (
    <article
      key={id}
      tabIndex={0}
      className="relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#E98C00] transition"
    >
      {/* Accent gradient */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-1.5 bg-linear-to-b from-[#E98C00] via-[#fbbf24] to-[#E98C00] rounded-r"
      />

      <div className="flex flex-col gap-3 p-5">
        {/* Header */}
        <h2 className="text-lg font-semibold text-gray-900">{name}</h2>

        {/* Description */}
        {description ? (
          <p className="text-sm text-gray-700 leading-relaxed mt-1">
            {description}
          </p>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
            <FileText className="h-4 w-4 text-gray-400" />
            <span>Geen beschrijving beschikbaar</span>
          </div>
        )}

        {/* Sermon usage */}
        <div className="mt-3 border-t border-gray-100 pt-2 flex items-center gap-2 text-sm text-gray-800">
          <HandCoins className="h-4 w-4 text-[#E98C00]" />
          <span>
            Gebruikt in <b>{sermon_count}</b>{" "}
            {sermon_count === 1 ? "preek" : "preken"}
          </span>
        </div>
      </div>
    </article>
  );
}
