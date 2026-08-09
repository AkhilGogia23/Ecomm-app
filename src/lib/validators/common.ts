import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.string().min(1, "Invalid id"),
});

export const couponSchema = z.object({
  code: z.string().min(3).max(30),
  description: z.string().optional(),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
  value: z.number().min(0),
  minOrderAmount: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  perUserLimit: z.number().int().min(1).default(1),
  applicableCategories: z.array(z.string()).optional(),
  applicableProducts: z.array(z.string()).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
});

export const addressSchema = z.object({
  label: z.enum(["HOME", "WORK", "OTHER"]).default("HOME"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(10).max(15),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(4).max(10),
  country: z.string().default("India"),
  isDefault: z.boolean().default(false),
});

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  comment: z.string().max(2000).optional(),
});

export const bannerSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  link: z.string().optional(),
  position: z.enum(["HERO", "SECONDARY", "SIDEBAR", "POPUP"]).default("HERO"),
  isActive: z.boolean().default(true),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  sortOrder: z.number().int().default(0),
});

export const pageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  content: z.string().default(""),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  isPublished: z.boolean().default(false),
});

export const settingsSchema = z.object({
  group: z.string(),
  values: z.record(z.string(), z.unknown()),
});
