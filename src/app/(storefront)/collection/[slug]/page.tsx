"use client";

import { Suspense, useEffect, useState, use } from "react";
import ShopGrid from "@/components/storefront/shop/ShopGrid";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

interface CollectionData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  bannerImagePath: string | null;
}

export default function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [collection, setCollection] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/collections/${slug}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCollection(json.data);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-64" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <EmptyState title="Collection not found" />
      </div>
    );
  }

  return (
    <div>
      {collection.bannerImagePath && (
        <div className="h-48 w-full overflow-hidden sm:h-64">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={collection.bannerImagePath} alt={collection.name} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">{collection.name}</h1>
        {collection.description && <p className="mb-6 text-sm text-gray-500 dark:text-neutral-400">{collection.description}</p>}
        <Suspense fallback={null}>
          <ShopGrid fixedCollection={collection.slug} />
        </Suspense>
      </div>
    </div>
  );
}
