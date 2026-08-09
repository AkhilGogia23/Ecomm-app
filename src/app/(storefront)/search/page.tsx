"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ShopGrid from "@/components/storefront/shop/ShopGrid";

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
        {q ? `Results for "${q}"` : "Search"}
      </h1>
      {q ? (
        <ShopGrid searchQuery={q} />
      ) : (
        <p className="text-sm text-gray-500 dark:text-neutral-400">Enter a search term to find products.</p>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResults />
    </Suspense>
  );
}
