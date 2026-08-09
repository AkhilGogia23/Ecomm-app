import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductDetailClient from "@/components/storefront/product/ProductDetailClient";

async function getProduct(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, isDeleted: false, status: "ACTIVE" },
    include: {
      variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      images: { orderBy: { position: "asc" } },
      categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
      reviews: {
        where: { isApproved: true },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  return product;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) return { title: "Product not found" };

  return {
    title: product.metaTitle || product.title,
    description: product.metaDescription || product.shortDescription || undefined,
    openGraph: {
      title: product.title,
      description: product.shortDescription ?? undefined,
      images: product.images[0] ? [product.images[0].filePath] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const categoryIds = product.categories.map((c) => c.category.id);
  const relatedProducts =
    categoryIds.length > 0
      ? await prisma.product.findMany({
          where: {
            isDeleted: false,
            status: "ACTIVE",
            id: { not: product.id },
            categories: { some: { categoryId: { in: categoryIds } } },
          },
          take: 4,
          include: { images: { orderBy: { position: "asc" }, take: 2 } },
        })
      : [];

  const avgRating =
    product.reviews.length > 0 ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length : 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.images.map((i) => i.filePath),
    description: product.shortDescription ?? product.description,
    offers: {
      "@type": "Offer",
      priceCurrency: product.currency,
      price: product.salePrice ?? product.basePrice,
      availability: product.variants.some((v) => v.stock > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
    ...(product.reviews.length > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avgRating.toFixed(1),
            reviewCount: product.reviews.length,
          },
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductDetailClient
        product={{
          id: product.id,
          title: product.title,
          slug: product.slug,
          description: product.description,
          shortDescription: product.shortDescription,
          basePrice: product.basePrice,
          salePrice: product.salePrice,
          weight: product.weight,
          weightUnit: product.weightUnit,
          hsnCode: product.hsnCode,
          variants: product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            size: v.size,
            color: v.color,
            colorHex: v.colorHex,
            stock: v.stock,
            lowStockThreshold: v.lowStockThreshold,
            price: v.price,
            salePrice: v.salePrice,
          })),
          images: product.images.map((i) => ({
            id: i.id,
            filePath: i.filePath,
            variantId: i.variantId,
          })),
          categories: product.categories.map((c) => c.category),
          reviews: product.reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            title: r.title,
            comment: r.comment,
            adminReply: r.adminReply,
            createdAt: r.createdAt.toISOString(),
            userName: r.user.name,
          })),
          avgRating,
          relatedProducts: relatedProducts.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            basePrice: p.basePrice,
            salePrice: p.salePrice,
            images: p.images.map((i) => ({ filePath: i.filePath, thumbPath: i.thumbPath })),
          })),
        }}
      />
    </>
  );
}
