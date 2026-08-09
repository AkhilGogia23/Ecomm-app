"use client";

import { useEffect, useState, use } from "react";
import ProductForm, { type ProductFormValues } from "@/components/admin/products/ProductForm";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

interface LookupItem {
  id: string;
  name: string;
  slug?: string;
  level?: number;
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [values, setValues] = useState<ProductFormValues | null>(null);
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [collections, setCollections] = useState<LookupItem[]>([]);
  const [tags, setTags] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const [productRes, catRes, colRes, tagRes] = await Promise.all([
        fetch(`/api/admin/products/${id}`).then((r) => r.json()),
        fetch("/api/admin/categories").then((r) => r.json()),
        fetch("/api/admin/collections").then((r) => r.json()),
        fetch("/api/admin/tags").then((r) => r.json()),
      ]);

      if (!productRes.success) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const p = productRes.data;
      setValues({
        id: p.id,
        title: p.title,
        shortDescription: p.shortDescription ?? "",
        description: p.description ?? "",
        sku: p.sku,
        barcode: p.barcode ?? "",
        basePrice: String(p.basePrice ?? ""),
        salePrice: p.salePrice != null ? String(p.salePrice) : "",
        costPrice: p.costPrice != null ? String(p.costPrice) : "",
        taxRate: String(p.taxRate ?? 0),
        hsnCode: p.hsnCode ?? "",
        status: p.status,
        isFeatured: p.isFeatured,
        isNewArrival: p.isNewArrival,
        isBestseller: p.isBestseller,
        weight: p.weight != null ? String(p.weight) : "",
        weightUnit: p.weightUnit ?? "g",
        metaTitle: p.metaTitle ?? "",
        metaDescription: p.metaDescription ?? "",
        metaKeywords: p.metaKeywords ?? "",
        categoryIds: p.categories.map((c: { categoryId: string }) => c.categoryId),
        collectionIds: p.collections.map((c: { collectionId: string }) => c.collectionId),
        tagIds: p.tags.map((t: { tagId: string }) => t.tagId),
        variants: p.variants.map((v: {
          id: string; sku: string; size: string | null; color: string | null; colorHex: string | null;
          stock: number; lowStockThreshold: number; price: number | null; salePrice: number | null;
          isActive: boolean; sortOrder: number;
        }) => ({
          id: v.id,
          sku: v.sku,
          size: v.size ?? "",
          color: v.color ?? "",
          colorHex: v.colorHex ?? "#000000",
          stock: v.stock,
          lowStockThreshold: v.lowStockThreshold,
          price: v.price != null ? String(v.price) : "",
          salePrice: v.salePrice != null ? String(v.salePrice) : "",
          isActive: v.isActive,
          sortOrder: v.sortOrder,
        })),
        images: p.images.map((img: {
          id: string; filePath: string; thumbPath: string | null; isThumbnail: boolean;
          altText: string | null; position: number;
        }) => ({
          id: img.id,
          filePath: img.filePath,
          thumbPath: img.thumbPath,
          isThumbnail: img.isThumbnail,
          altText: img.altText,
          position: img.position,
        })),
      });

      if (catRes.success) setCategories(catRes.data);
      if (colRes.success) setCollections(colRes.data);
      if (tagRes.success) setTags(tagRes.data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (notFound || !values) {
    return <EmptyState title="Product not found" description="It may have been deleted." />;
  }

  return (
    <ProductForm
      mode="edit"
      productId={id}
      initialValues={values}
      categories={categories}
      collections={collections}
      tags={tags}
    />
  );
}
