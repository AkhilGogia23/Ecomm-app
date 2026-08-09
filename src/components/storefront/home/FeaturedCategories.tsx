"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Skeleton from "@/components/ui/Skeleton";

interface Category {
  id: string;
  name: string;
  slug: string;
  imagePath: string | null;
  parentId: string | null;
}

export default function FeaturedCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCategories(json.data.filter((c: Category) => !c.parentId));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-32 shrink-0 rounded-lg" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) return null;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {categories.map((c) => (
        <Link key={c.id} href={`/category/${c.slug}`} className="group shrink-0 text-center">
          <div className="h-32 w-32 overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800">
            {c.imagePath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.imagePath} alt={c.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">{c.name}</div>
            )}
          </div>
          <p className="mt-2 text-sm font-medium text-gray-800 dark:text-neutral-200">{c.name}</p>
        </Link>
      ))}
    </div>
  );
}
