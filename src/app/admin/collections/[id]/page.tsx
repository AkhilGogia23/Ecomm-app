"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import SearchInput from "@/components/ui/SearchInput";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/utils/price";
import { toast } from "@/store/toast";

interface LinkedProduct {
  productId: string;
  product: { id: string; title: string; sku: string; basePrice: number };
}

interface CollectionDetail {
  id: string;
  name: string;
  description: string | null;
  type: string;
  products: LinkedProduct[];
}

interface SearchResult {
  id: string;
  title: string;
  sku: string;
  basePrice: number;
}

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchCollection = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/collections/${id}`);
      const json = await res.json();
      if (json.success) setCollection(json.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    fetchCollection();
  }, [fetchCollection]);

  async function handleSearch(query: string) {
    if (!query) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/products?search=${encodeURIComponent(query)}&limit=10`);
      const json = await res.json();
      if (json.success) setSearchResults(json.data);
    } finally {
      setSearching(false);
    }
  }

  async function addProduct(productId: string) {
    const res = await fetch(`/api/admin/collections/${id}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: [productId] }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Product added");
      fetchCollection();
    } else {
      toast.error(json.error ?? "Failed to add product");
    }
  }

  async function removeProduct(productId: string) {
    const res = await fetch(`/api/admin/collections/${id}/products?productId=${productId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Product removed");
      fetchCollection();
    } else {
      toast.error(json.error ?? "Failed to remove product");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!collection) {
    return <EmptyState title="Collection not found" />;
  }

  const linkedIds = new Set(collection.products.map((p) => p.productId));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/collections" className="mb-1 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:text-neutral-400">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to collections
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{collection.name}</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{collection.description}</p>
        </div>
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="h-4 w-4" /> Add Products
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-medium text-gray-900 dark:text-white">Products ({collection.products.length})</h2>
        </CardHeader>
        <CardBody className="p-0">
          {collection.products.length === 0 ? (
            <EmptyState title="No products in this collection" description="Add products to feature them here." />
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="px-5 py-2 font-medium">Title</th>
                  <th className="px-5 py-2 font-medium">SKU</th>
                  <th className="px-5 py-2 font-medium">Price</th>
                  <th className="px-5 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {collection.products.map((p) => (
                  <tr key={p.productId} className="border-b border-gray-50 last:border-0 dark:border-neutral-800/50">
                    <td className="px-5 py-2.5 font-medium text-gray-900 dark:text-white">{p.product.title}</td>
                    <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{p.product.sku}</td>
                    <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{formatPrice(p.product.basePrice)}</td>
                    <td className="px-5 py-2.5">
                      <button
                        onClick={() => removeProduct(p.productId)}
                        className="text-red-500 hover:text-red-700"
                        aria-label={`Remove ${p.product.title}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Products" size="lg">
        <div className="space-y-3">
          <SearchInput onSearch={handleSearch} loading={searching} placeholder="Search products by title or SKU..." />
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {searchResults.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 dark:border-neutral-800"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{p.title}</p>
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    {p.sku} · {formatPrice(p.basePrice)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={linkedIds.has(p.id) ? "secondary" : "primary"}
                  disabled={linkedIds.has(p.id)}
                  onClick={() => addProduct(p.id)}
                >
                  {linkedIds.has(p.id) ? "Added" : "Add"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
