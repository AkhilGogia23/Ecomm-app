import { z } from "zod";

export const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1),
  size: z.string().optional(),
  color: z.string().optional(),
  colorHex: z.string().optional(),
  material: z.string().optional(),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  price: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  barcode: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const createProductSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().default(""),
  shortDescription: z.string().optional(),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  basePrice: z.number().min(0),
  salePrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  currency: z.string().default("INR"),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED", "OUT_OF_STOCK"]).default("DRAFT"),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  weight: z.number().min(0).optional(),
  weightUnit: z.string().default("g"),
  hsnCode: z.string().optional(),
  taxRate: z.number().min(0).max(100).default(0),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  metaKeywords: z.string().optional(),
  categoryIds: z.array(z.string()).default([]),
  collectionIds: z.array(z.string()).default([]),
  tagIds: z.array(z.string()).default([]),
  variants: z.array(variantSchema).default([]),
});

export const updateProductSchema = createProductSchema.partial();

export const bulkProductRowSchema = z.object({
  title: z.string().min(1),
  sku: z.string().min(1),
  description: z.string().optional(),
  short_description: z.string().optional(),
  base_price: z.coerce.number().min(0),
  sale_price: z.coerce.number().min(0).optional(),
  category_slugs: z.string().optional(),
  collection_slugs: z.string().optional(),
  tags: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED", "OUT_OF_STOCK"]).default("DRAFT"),
  size: z.string().optional(),
  color: z.string().optional(),
  variant_sku: z.string().optional(),
  stock: z.coerce.number().int().min(0).default(0),
});

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED", "OUT_OF_STOCK"]).optional(),
  category: z.string().optional(),
  collection: z.string().optional(),
  search: z.string().optional(),
  sort: z
    .enum(["newest", "price_asc", "price_desc", "bestselling", "name_asc"])
    .default("newest"),
});
