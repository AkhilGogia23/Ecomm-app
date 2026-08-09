"use client";

import { useEffect, useState } from "react";
import ProductForm, { type ProductFormValues } from "@/components/admin/products/ProductForm";
import Skeleton from "@/components/ui/Skeleton";

interface LookupItem {
  id: string;
  name: string;
  slug?: string;
  level?: number;
}

const EMPTY_VALUES: ProductFormValues = {
  title: "",
  shortDescription: "",
  description: "",
  sku: "",
  barcode: "",
  basePrice: "",
  salePrice: "",
  costPrice: "",
  taxRate: "0",
  hsnCode: "",
  status: "DRAFT",
  isFeatured: false,
  isNewArrival: false,
  isBestseller: false,
  weight: "",
  weightUnit: "g",
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  categoryIds: [],
  collectionIds: [],
  tagIds: [],
  variants: [],
  images: [],
};

export default function NewProductPage() {
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [collections, setCollections] = useState<LookupItem[]>([]);
  const [tags, setTags] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [catRes, colRes, tagRes] = await Promise.all([
        fetch("/api/admin/categories").then((r) => r.json()),
        fetch("/api/admin/collections").then((r) => r.json()),
        fetch("/api/admin/tags").then((r) => r.json()),
      ]);
      if (catRes.success) setCategories(catRes.data);
      if (colRes.success) setCollections(colRes.data);
      if (tagRes.success) setTags(tagRes.data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <ProductForm
      mode="create"
      initialValues={EMPTY_VALUES}
      categories={categories}
      collections={collections}
      tags={tags}
    />
  );
}
