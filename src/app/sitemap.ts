import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const [products, categories, collections, pages] = await Promise.all([
    prisma.product.findMany({ where: { isDeleted: false, status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.collection.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.page.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
  ]);

  return [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/shop`, lastModified: new Date() },
    { url: `${baseUrl}/contact`, lastModified: new Date() },
    ...products.map((p) => ({ url: `${baseUrl}/product/${p.slug}`, lastModified: p.updatedAt })),
    ...categories.map((c) => ({ url: `${baseUrl}/category/${c.slug}`, lastModified: c.updatedAt })),
    ...collections.map((c) => ({ url: `${baseUrl}/collection/${c.slug}`, lastModified: c.updatedAt })),
    ...pages.map((p) => ({ url: `${baseUrl}/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
