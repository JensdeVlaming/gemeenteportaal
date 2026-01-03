import { CollectionCard } from "@/components/collection/CollectionCard";
import { Loader } from "@/components/Loader";
import { useCollections } from "@/hooks/useCollections";

export default function CollectionList() {
  const { collections, loading } = useCollections();

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader label="Collectes worden geladen…" />
      </div>
    );

  if (!collections?.length)
    return (
      <p className="text-center text-gray-500 py-10">
        Geen collectes gevonden.
      </p>
    );

  return (
    <section
      aria-label="Lijst van collectes"
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {collections.map((c) => (
        <CollectionCard key={c.id} collection={c} />
      ))}
    </section>
  );
}
