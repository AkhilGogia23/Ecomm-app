"use client";

import { useEffect, useState } from "react";
import ProductCard, { type ProductCardData } from "@/components/storefront/ProductCard";
import Skeleton from "@/components/ui/Skeleton";

export default function ProductGridSection({ filter, title }: { filter: string; title: string }) {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products?${filter}=true&limit=8`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setProducts(json.data);
      })
      .finally(() => setLoading(false));
  }, [filter]);

  if (!loading && products.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] w-full" />)
          : products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
