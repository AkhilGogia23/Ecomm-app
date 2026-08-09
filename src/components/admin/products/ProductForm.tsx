"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Star, X } from "lucide-react";
import Tabs from "@/components/ui/Tabs";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import RichTextEditor from "@/components/ui/RichTextEditor";
import FileUpload from "@/components/ui/FileUpload";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import VariantGenerator, { type GeneratedVariant } from "./VariantGenerator";
import { generateSlug } from "@/lib/utils/slug";
import { toast } from "@/store/toast";
import { cn } from "@/lib/cn";

export interface VariantFormValue {
  id?: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
  lowStockThreshold: number;
  price: string;
  salePrice: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ImageFormValue {
  id: string;
  filePath: string;
  thumbPath: string | null;
  isThumbnail: boolean;
  altText: string | null;
  position: number;
}

export interface ProductFormValues {
  id?: string;
  title: string;
  shortDescription: string;
  description: string;
  sku: string;
  barcode: string;
  basePrice: string;
  salePrice: string;
  costPrice: string;
  taxRate: string;
  hsnCode: string;
  status: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestseller: boolean;
  weight: string;
  weightUnit: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  categoryIds: string[];
  collectionIds: string[];
  tagIds: string[];
  variants: VariantFormValue[];
  images: ImageFormValue[];
}

interface LookupItem {
  id: string;
  name: string;
  slug?: string;
  level?: number;
}

interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
  initialValues: ProductFormValues;
  categories: LookupItem[];
  collections: LookupItem[];
  tags: LookupItem[];
}

const STATUS_OPTIONS = [
  { label: "Draft", value: "DRAFT" },
  { label: "Active", value: "ACTIVE" },
  { label: "Archived", value: "ARCHIVED" },
  { label: "Out of Stock", value: "OUT_OF_STOCK" },
];

export default function ProductForm({
  mode,
  productId,
  initialValues,
  categories,
  collections,
  tags,
}: ProductFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>(initialValues);
  const [saving, setSaving] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const slugPreview = useMemo(() => generateSlug(values.title || ""), [values.title]);

  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function updateVariant(index: number, patch: Partial<VariantFormValue>) {
    setValues((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));
  }

  function removeVariant(index: number) {
    setValues((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));
  }

  function addVariant() {
    setValues((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          sku: `${values.sku || "SKU"}-${prev.variants.length + 1}`,
          size: "",
          color: "",
          colorHex: "#000000",
          stock: 0,
          lowStockThreshold: 5,
          price: "",
          salePrice: "",
          isActive: true,
          sortOrder: prev.variants.length,
        },
      ],
    }));
  }

  function handleGenerateVariants(generated: GeneratedVariant[]) {
    setValues((prev) => {
      const base = values.sku || "SKU";
      const newVariants: VariantFormValue[] = generated.map((g, i) => ({
        sku: `${base}-${g.size}-${g.color}`.toUpperCase().replace(/\s+/g, "-"),
        size: g.size,
        color: g.color,
        colorHex: g.colorHex,
        stock: 0,
        lowStockThreshold: 5,
        price: "",
        salePrice: "",
        isActive: true,
        sortOrder: prev.variants.length + i,
      }));
      return { ...prev, variants: [...prev.variants, ...newVariants] };
    });
  }

  function toggleMultiSelect(key: "categoryIds" | "collectionIds" | "tagIds", id: string) {
    setValues((prev) => ({
      ...prev,
      [key]: prev[key].includes(id) ? prev[key].filter((v) => v !== id) : [...prev[key], id],
    }));
  }

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name) return;
    const res = await fetch("/api/admin/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (json.success) {
      toggleMultiSelect("tagIds", json.data.id);
      setNewTagName("");
      toast.success(`Tag "${name}" added`);
    }
  }

  function buildPayload() {
    return {
      title: values.title,
      shortDescription: values.shortDescription || undefined,
      description: values.description,
      sku: values.sku,
      barcode: values.barcode || undefined,
      basePrice: Number(values.basePrice || 0),
      salePrice: values.salePrice ? Number(values.salePrice) : undefined,
      costPrice: values.costPrice ? Number(values.costPrice) : undefined,
      taxRate: Number(values.taxRate || 0),
      hsnCode: values.hsnCode || undefined,
      status: values.status,
      isFeatured: values.isFeatured,
      isNewArrival: values.isNewArrival,
      isBestseller: values.isBestseller,
      weight: values.weight ? Number(values.weight) : undefined,
      weightUnit: values.weightUnit,
      metaTitle: values.metaTitle || undefined,
      metaDescription: values.metaDescription || undefined,
      metaKeywords: values.metaKeywords || undefined,
      categoryIds: values.categoryIds,
      collectionIds: values.collectionIds,
      tagIds: values.tagIds,
      variants: values.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        size: v.size || undefined,
        color: v.color || undefined,
        colorHex: v.colorHex || undefined,
        stock: v.stock,
        lowStockThreshold: v.lowStockThreshold,
        price: v.price ? Number(v.price) : undefined,
        salePrice: v.salePrice ? Number(v.salePrice) : undefined,
        isActive: v.isActive,
        sortOrder: v.sortOrder,
      })),
    };
  }

  async function handleSave() {
    if (!values.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!values.sku.trim()) {
      toast.error("SKU is required");
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      const url = mode === "create" ? "/api/admin/products" : `/api/admin/products/${productId}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error ?? "Failed to save product");
        return;
      }

      toast.success(mode === "create" ? "Product created" : "Product updated");

      if (mode === "create") {
        router.push(`/admin/products/${json.data.id}/edit`);
      } else {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(files: File[]) {
    if (!productId) return;
    setUploadingImages(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));

      const res = await fetch(`/api/admin/products/${productId}/images`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (json.success) {
        setValues((prev) => ({
          ...prev,
          images: [
            ...prev.images,
            ...json.data.map((img: { id: string; filePath: string; thumbPath: string | null; isThumbnail: boolean; position: number }) => ({
              id: img.id,
              filePath: img.filePath,
              thumbPath: img.thumbPath,
              isThumbnail: img.isThumbnail,
              altText: null,
              position: img.position,
            })),
          ],
        }));
        toast.success("Images uploaded");
      } else {
        toast.error(json.error ?? "Failed to upload images");
      }
    } finally {
      setUploadingImages(false);
    }
  }

  async function handleDeleteImage() {
    if (!deleteImageId || !productId) return;
    const res = await fetch(`/api/admin/products/${productId}/images?imageId=${deleteImageId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (json.success) {
      setValues((prev) => ({ ...prev, images: prev.images.filter((i) => i.id !== deleteImageId) }));
      toast.success("Image deleted");
    } else {
      toast.error(json.error ?? "Failed to delete image");
    }
    setDeleteImageId(null);
  }

  async function setThumbnail(imageId: string) {
    if (!productId) return;
    const order = values.images.map((img) => ({
      id: img.id,
      position: img.id === imageId ? 0 : img.position + 1,
    }));
    const res = await fetch(`/api/admin/products/${productId}/images`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
    const json = await res.json();
    if (json.success) {
      setValues((prev) => ({
        ...prev,
        images: prev.images
          .map((img) => ({ ...img, isThumbnail: img.id === imageId }))
          .sort((a, b) => (a.id === imageId ? -1 : b.id === imageId ? 1 : 0)),
      }));
      toast.success("Thumbnail updated");
    }
  }

  const basicTab = (
    <div className="space-y-4">
      <Input
        label="Title"
        value={values.title}
        onChange={(e) => update("title", e.target.value)}
        required
      />
      <p className="-mt-2 text-xs text-gray-400">Slug: /{slugPreview || "..."}</p>
      <Input
        label="Short Description"
        value={values.shortDescription}
        onChange={(e) => update("shortDescription", e.target.value)}
        helperText="Shown in product cards and search results"
      />
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
          Description
        </label>
        <RichTextEditor value={values.description} onChange={(html) => update("description", html)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="SKU" value={values.sku} onChange={(e) => update("sku", e.target.value)} required />
        <Input label="Barcode" value={values.barcode} onChange={(e) => update("barcode", e.target.value)} />
      </div>
    </div>
  );

  const pricingTab = (
    <div className="grid grid-cols-2 gap-4">
      <Input
        label="Base Price (₹)"
        type="number"
        value={values.basePrice}
        onChange={(e) => update("basePrice", e.target.value)}
        required
      />
      <Input
        label="Sale Price (₹)"
        type="number"
        value={values.salePrice}
        onChange={(e) => update("salePrice", e.target.value)}
      />
      <Input
        label="Cost Price (₹)"
        type="number"
        value={values.costPrice}
        onChange={(e) => update("costPrice", e.target.value)}
      />
      <Input
        label="Tax Rate (%)"
        type="number"
        value={values.taxRate}
        onChange={(e) => update("taxRate", e.target.value)}
      />
      <Input label="HSN Code" value={values.hsnCode} onChange={(e) => update("hsnCode", e.target.value)} />
    </div>
  );

  const variantsTab = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-neutral-400">{values.variants.length} variant(s)</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGeneratorOpen(true)}>
            Generate Variants
          </Button>
          <Button variant="secondary" size="sm" onClick={addVariant}>
            <Plus className="h-4 w-4" /> Add Variant
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 dark:border-neutral-800 dark:text-neutral-400">
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Size</th>
              <th className="px-3 py-2 font-medium">Color</th>
              <th className="px-3 py-2 font-medium">Stock</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Sale Price</th>
              <th className="px-3 py-2 font-medium">Active</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {values.variants.map((v, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-0 dark:border-neutral-800/50">
                <td className="px-3 py-1.5">
                  <input
                    value={v.sku}
                    onChange={(e) => updateVariant(i, { sku: e.target.value })}
                    className="w-32 rounded border border-gray-200 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    value={v.size}
                    onChange={(e) => updateVariant(i, { size: e.target.value })}
                    className="w-16 rounded border border-gray-200 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={v.colorHex}
                      onChange={(e) => updateVariant(i, { colorHex: e.target.value })}
                      className="h-6 w-6 rounded border border-gray-200 dark:border-neutral-700"
                    />
                    <input
                      value={v.color}
                      onChange={(e) => updateVariant(i, { color: e.target.value })}
                      className="w-20 rounded border border-gray-200 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                    />
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    value={v.stock}
                    onChange={(e) => updateVariant(i, { stock: Number(e.target.value) })}
                    className="w-16 rounded border border-gray-200 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    value={v.price}
                    onChange={(e) => updateVariant(i, { price: e.target.value })}
                    placeholder="override"
                    className="w-20 rounded border border-gray-200 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    value={v.salePrice}
                    onChange={(e) => updateVariant(i, { salePrice: e.target.value })}
                    placeholder="override"
                    className="w-20 rounded border border-gray-200 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </td>
                <td className="px-3 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={v.isActive}
                    onChange={(e) => updateVariant(i, { isActive: e.target.checked })}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <button onClick={() => removeVariant(i)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {values.variants.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-400">
                  No variants yet. Generate or add one manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <VariantGenerator
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        onGenerate={handleGenerateVariants}
      />
    </div>
  );

  const imagesTab =
    mode === "create" ? (
      <p className="text-sm text-gray-500 dark:text-neutral-400">
        Save the product first to start uploading images.
      </p>
    ) : (
      <div className="space-y-4">
        <FileUpload onFilesAccepted={handleImageUpload} />
        {uploadingImages && <p className="text-sm text-gray-500">Uploading...</p>}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {values.images.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-md border border-gray-200 dark:border-neutral-700"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumbPath ?? img.filePath} alt={img.altText ?? ""} className="h-full w-full object-cover" />
              {img.isThumbnail && (
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                  Thumbnail
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-1 py-1 opacity-0 group-hover:opacity-100">
                <button onClick={() => setThumbnail(img.id)} aria-label="Set as thumbnail" className="text-white">
                  <Star className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setDeleteImageId(img.id)} aria-label="Delete image" className="text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  const organizationTab = (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-neutral-300">Categories</p>
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2 dark:border-neutral-800">
          {categories.map((c) => (
            <label key={c.id} className={cn("flex items-center gap-2 rounded px-1.5 py-1 text-sm", (c.level ?? 0) > 0 && "ml-4")}>
              <input
                type="checkbox"
                checked={values.categoryIds.includes(c.id)}
                onChange={() => toggleMultiSelect("categoryIds", c.id)}
              />
              {c.name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-neutral-300">Collections</p>
        <div className="flex flex-wrap gap-2">
          {collections.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-1.5 rounded-full border border-gray-300 px-2.5 py-1 text-xs dark:border-neutral-700"
            >
              <input
                type="checkbox"
                checked={values.collectionIds.includes(c.id)}
                onChange={() => toggleMultiSelect("collectionIds", c.id)}
              />
              {c.name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-neutral-300">Tags</p>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <label
              key={t.id}
              className="flex items-center gap-1.5 rounded-full border border-gray-300 px-2.5 py-1 text-xs dark:border-neutral-700"
            >
              <input
                type="checkbox"
                checked={values.tagIds.includes(t.id)}
                onChange={() => toggleMultiSelect("tagIds", t.id)}
              />
              {t.name}
            </label>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            placeholder="New tag name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            className="w-40"
          />
          <Button type="button" variant="secondary" size="sm" onClick={handleCreateTag}>
            Add tag
          </Button>
        </div>
      </div>
    </div>
  );

  const seoTab = (
    <div className="space-y-4">
      <Input
        label="Meta Title"
        value={values.metaTitle}
        onChange={(e) => update("metaTitle", e.target.value.slice(0, 60))}
        helperText={`${values.metaTitle.length}/60 characters`}
      />
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
          Meta Description
        </label>
        <textarea
          value={values.metaDescription}
          onChange={(e) => update("metaDescription", e.target.value.slice(0, 160))}
          rows={3}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-white"
        />
        <p className="mt-1 text-xs text-gray-400">{values.metaDescription.length}/160 characters</p>
      </div>
      <Input
        label="Meta Keywords"
        value={values.metaKeywords}
        onChange={(e) => update("metaKeywords", e.target.value)}
        helperText="Comma-separated keywords"
      />
    </div>
  );

  const settingsTab = (
    <div className="space-y-4">
      <Select
        label="Status"
        value={values.status}
        onChange={(e) => update("status", e.target.value)}
        options={STATUS_OPTIONS}
      />
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={values.isFeatured}
            onChange={(e) => update("isFeatured", e.target.checked)}
          />
          Featured product
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={values.isNewArrival}
            onChange={(e) => update("isNewArrival", e.target.checked)}
          />
          New arrival
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={values.isBestseller}
            onChange={(e) => update("isBestseller", e.target.checked)}
          />
          Bestseller
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Weight" type="number" value={values.weight} onChange={(e) => update("weight", e.target.value)} />
        <Select
          label="Weight Unit"
          value={values.weightUnit}
          onChange={(e) => update("weightUnit", e.target.value)}
          options={[
            { label: "grams", value: "g" },
            { label: "kilograms", value: "kg" },
          ]}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {mode === "create" ? "Add Product" : "Edit Product"}
          </h1>
          {values.title && <p className="text-sm text-gray-500 dark:text-neutral-400">{values.title}</p>}
        </div>
        <Button onClick={handleSave} loading={saving}>
          {mode === "create" ? "Create Product" : "Save Changes"}
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <Tabs
          tabs={[
            { key: "basic", label: "Basic Info", content: basicTab },
            { key: "pricing", label: "Pricing", content: pricingTab },
            { key: "variants", label: "Variants", content: variantsTab },
            { key: "images", label: "Images", content: imagesTab },
            { key: "organization", label: "Organization", content: organizationTab },
            { key: "seo", label: "SEO", content: seoTab },
            { key: "settings", label: "Settings", content: settingsTab },
          ]}
        />
      </div>

      <ConfirmDialog
        open={!!deleteImageId}
        title="Delete image"
        description="This image will be permanently removed."
        confirmLabel="Delete"
        onConfirm={handleDeleteImage}
        onCancel={() => setDeleteImageId(null)}
      />
    </div>
  );
}
