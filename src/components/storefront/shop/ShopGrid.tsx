"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import ProductCard, { type ProductCardData } from "@/components/storefront/ProductCard";
import FilterSidebar, { type Filters } from "./FilterSidebar";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";

interface ShopGridProps {
  fixedCategory?: string;
  fixedCollection?: string;
  searchQuery?: string;
}

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Bestselling", value: "bestselling" },
  { label: "Name: A-Z", value: "name_asc" },
];

function parseFilters(params: URLSearchParams, fixedCategory?: string): Filters {
  return {
    category: fixedCategory ?? params.get("category") ?? "",
    sizes: params.get("sizes")?.split(",").filter(Boolean) ?? [],
    colors: params.get("colors")?.split(",").filter(Boolean) ?? [],
    minPrice: params.get("minPrice") ?? "",
    maxPrice: params.get("maxPrice") ?? "",
    inStock: params.get("inStock") === "true",
  };
}

export default function ShopGrid({ fixedCategory, fixedCollection, searchQuery }: ShopGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<Filters>(() => parseFilters(searchParams, fixedCategory));
  const [sort, setSort] = useState(searchParams.get("sort") ?? "newest");
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "1"));
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const limit = 24;

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    if (!fixedCategory && filters.category) p.set("category", filters.category);
    if (fixedCollection) p.set("collection", fixedCollection);
    if (filters.sizes.length > 0) p.set("sizes", filters.sizes.join(","));
    if (filters.colors.length > 0) p.set("colors", filters.colors.join(","));
    if (filters.minPrice) p.set("minPrice", filters.minPrice);
    if (filters.maxPrice) p.set("maxPrice", filters.maxPrice);
    if (filters.inStock) p.set("inStock", "true");
    if (sort !== "newest") p.set("sort", sort);
    if (page > 1) p.set("page", String(page));
    return p;
  }, [filters, sort, page, fixedCategory, fixedCollection]);

  useEffect(() => {
    const params = buildParams();
    router.replace(`?${params.toString()}`, { scroll: false });

    async function load() {
      setLoading(true);
      try {
        const apiParams = new URLSearchParams(params);
        apiParams.set("limit", String(limit));
        if (fixedCategory) apiParams.set("category", fixedCategory);
        if (searchQuery) apiParams.set("search", searchQuery);
        const res = await fetch(`/api/products?${apiParams.toString()}`);
        const json = await res.json();
        if (json.success) {
          setProducts(json.data);
          setTotal(json.meta?.total ?? 0);
          setTotalPages(json.meta?.totalPages ?? 1);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort, page, fixedCategory, fixedCollection, searchQuery]);

  function updateFilters(next: Filters) {
    setFilters(next);
    setPage(1);
  }

  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (!fixedCategory && filters.category) {
    activeChips.push({ label: `Category: ${filters.category}`, onRemove: () => updateFilters({ ...filters, category: "" }) });
  }
  filters.sizes.forEach((s) =>
    activeChips.push({ label: `Size: ${s}`, onRemove: () => updateFilters({ ...filters, sizes: filters.sizes.filter((v) => v !== s) }) })
  );
  filters.colors.forEach((c) =>
    activeChips.push({ label: `Color: ${c}`, onRemove: () => updateFilters({ ...filters, colors: filters.colors.filter((v) => v !== c) }) })
  );
  if (filters.inStock) {
    activeChips.push({ label: "In Stock", onRemove: () => updateFilters({ ...filters, inStock: false }) });
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:block">
        <FilterSidebar filters={filters} onChange={updateFilters} hideCategoryFilter={!!fixedCategory} />
      </aside>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            {loading ? "Loading..." : `Showing ${(page - 1) * limit + 1}-${Math.min(page * limit, total)} of ${total} products`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-neutral-700 lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </button>
            <Select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              options={SORT_OPTIONS}
              className="w-48"
            />
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {activeChips.map((chip, i) => (
              <button
                key={i}
                onClick={chip.onRemove}
                className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {chip.label} <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState title="No products found" description="Try adjusting your filters." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
        )}
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-xl bg-white p-4 dark:bg-neutral-900">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold text-gray-900 dark:text-white">Filters</span>
              <button onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <FilterSidebar filters={filters} onChange={updateFilters} hideCategoryFilter={!!fixedCategory} />
          </div>
        </div>
      )}
    </div>
  );
}
