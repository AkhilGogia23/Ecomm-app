"use client";

import { Suspense, useEffect, useState, use } from "react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ShopGrid from "@/components/storefront/shop/ShopGrid";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/categories/${slug}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCategory(json.data);
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

  if (!category) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <EmptyState title="Category not found" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: category.name }]} />
      <h1 className="mb-2 mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{category.name}</h1>
      {category.description && <p className="mb-6 text-sm text-gray-500 dark:text-neutral-400">{category.description}</p>}
      <Suspense fallback={null}>
        <ShopGrid fixedCategory={category.slug} />
      </Suspense>
    </div>
  );
}
