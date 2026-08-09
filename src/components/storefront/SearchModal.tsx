"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Search as SearchIcon } from "lucide-react";
import { formatPrice } from "@/lib/utils/price";

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  basePrice: number;
  salePrice: number | null;
  images: { filePath: string; thumbPath: string | null }[];
}

export default function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      const stored = localStorage.getItem("recent-searches");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync recent searches from localStorage on open
      setRecent(stored ? JSON.parse(stored) : []);
    }
  }, [open]);

  useEffect(() => {
    if (!query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear results when query is emptied
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`);
        const json = await res.json();
        if (json.success) setResults(json.data);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function submitSearch() {
    if (!query.trim()) return;
    const stored = localStorage.getItem("recent-searches");
    const list: string[] = stored ? JSON.parse(stored) : [];
    const next = [query, ...list.filter((s) => s !== query)].slice(0, 5);
    localStorage.setItem("recent-searches", JSON.stringify(next));
    router.push(`/search?q=${encodeURIComponent(query)}`);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        className="mx-auto mt-20 w-full max-w-xl rounded-xl bg-white p-4 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-gray-200 pb-3 dark:border-neutral-800">
          <SearchIcon className="h-5 w-5 text-gray-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitSearch()}
            placeholder="Search for products..."
            className="flex-1 bg-transparent text-sm text-gray-900 outline-none dark:text-white"
          />
          <button onClick={onClose} aria-label="Close search">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="mt-3 max-h-96 overflow-y-auto">
          {!query && recent.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-medium text-gray-400">Recent Searches</p>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button
                    key={r}
                    onClick={() => setQuery(r)}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && <p className="py-4 text-center text-sm text-gray-400">Searching...</p>}

          {!loading && results.length > 0 && (
            <div className="space-y-2">
              {results.map((r) => (
                <Link
                  key={r.id}
                  href={`/product/${r.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  <div className="h-12 w-10 overflow-hidden rounded bg-gray-100 dark:bg-neutral-800">
                    {r.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.images[0].thumbPath ?? r.images[0].filePath} alt={r.title} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">{r.title}</p>
                    <p className="text-xs text-gray-500">{formatPrice(r.salePrice ?? r.basePrice)}</p>
                  </div>
                </Link>
              ))}
              <button onClick={submitSearch} className="w-full pt-2 text-center text-sm font-medium text-gray-700 hover:underline dark:text-neutral-300">
                View all results for &ldquo;{query}&rdquo;
              </button>
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">No products found</p>
          )}
        </div>
      </div>
    </div>
  );
}
