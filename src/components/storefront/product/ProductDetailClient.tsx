"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Heart, Share2, Ruler, Star, Check } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Tabs from "@/components/ui/Tabs";
import ProductCard, { type ProductCardData } from "@/components/storefront/ProductCard";
import PriceDisplay from "@/components/storefront/PriceDisplay";
import { useCartStore } from "@/store/cart";
import { toast } from "@/store/toast";
import { cn } from "@/lib/cn";

interface Variant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  stock: number;
  lowStockThreshold: number;
  price: number | null;
  salePrice: number | null;
}

interface ProductImage {
  id: string;
  filePath: string;
  variantId: string | null;
}

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  adminReply: string | null;
  createdAt: string;
  userName: string;
}

interface ProductDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  basePrice: number;
  salePrice: number | null;
  weight: number | null;
  weightUnit: string;
  hsnCode: string | null;
  variants: Variant[];
  images: ProductImage[];
  categories: { id: string; name: string; slug: string }[];
  reviews: Review[];
  avgRating: number;
  relatedProducts: ProductCardData[];
}

function useRecentlyViewed(product: ProductDetail) {
  const [items, setItems] = useState<ProductCardData[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("recently-viewed");
    const list: ProductCardData[] = stored ? JSON.parse(stored) : [];
    const filtered = list.filter((p) => p.id !== product.id);
    const next = [
      {
        id: product.id,
        title: product.title,
        slug: product.slug,
        basePrice: product.basePrice,
        salePrice: product.salePrice,
        images: product.images.slice(0, 1).map((i) => ({ filePath: i.filePath, thumbPath: null })),
      },
      ...filtered,
    ].slice(0, 4);
    localStorage.setItem("recently-viewed", JSON.stringify(next));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync recently-viewed list from localStorage
    setItems(filtered.slice(0, 4));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  return items;
}

export default function ProductDetailClient({ product }: { product: ProductDetail }) {
  const { data: session } = useSession();
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.open);

  const sizes = useMemo(() => Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean))) as string[], [product.variants]);
  const colors = useMemo(() => {
    const map = new Map<string, string>();
    product.variants.forEach((v) => {
      if (v.color) map.set(v.color, v.colorHex ?? "#000000");
    });
    return Array.from(map.entries());
  }, [product.variants]);

  const [selectedSize, setSelectedSize] = useState<string | null>(sizes[0] ?? null);
  const [selectedColor, setSelectedColor] = useState<string | null>(colors[0]?.[0] ?? null);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  const recentlyViewed = useRecentlyViewed(product);

  const selectedVariant = useMemo(
    () => product.variants.find((v) => v.size === selectedSize && v.color === selectedColor) ?? product.variants[0],
    [product.variants, selectedSize, selectedColor]
  );

  const displayImages = useMemo(() => {
    const variantImages = product.images.filter((i) => i.variantId === selectedVariant?.id);
    return variantImages.length > 0 ? variantImages : product.images;
  }, [product.images, selectedVariant]);

  const effectivePrice = selectedVariant?.price ?? product.basePrice;
  const effectiveSalePrice = selectedVariant?.salePrice ?? product.salePrice;

  function isSizeAvailable(size: string) {
    return product.variants.some((v) => v.size === size && (!selectedColor || v.color === selectedColor) && v.stock > 0);
  }

  async function handleAddToCart() {
    if (!selectedVariant) {
      toast.error("Please select a size and color");
      return;
    }
    if (selectedVariant.stock < quantity) {
      toast.error("Not enough stock available");
      return;
    }

    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      title: product.title,
      slug: product.slug,
      image: displayImages[0]?.filePath ?? null,
      price: effectivePrice,
      salePrice: effectiveSalePrice,
      size: selectedVariant.size,
      color: selectedVariant.color,
      quantity,
      stock: selectedVariant.stock,
    });

    toast.success("Added to cart");
    openCart();
  }

  async function toggleWishlist() {
    if (!session?.user) {
      toast.error("Sign in to save items to your wishlist");
      return;
    }
    const method = wishlisted ? "DELETE" : "POST";
    const res = await fetch("/api/wishlist", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
    });
    const json = await res.json();
    if (json.success) setWishlisted(!wishlisted);
  }

  function shareWhatsApp() {
    const url = window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${product.title} - ${url}`)}`, "_blank");
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied");
  }

  async function submitReview() {
    if (!session?.user) {
      toast.error("Sign in to write a review");
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, ...reviewForm }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Review submitted for approval");
        setReviewForm({ rating: 5, title: "", comment: "" });
      } else {
        toast.error(json.error ?? "Failed to submit review");
      }
    } finally {
      setSubmittingReview(false);
    }
  }

  const stockLabel = !selectedVariant
    ? "Select options"
    : selectedVariant.stock === 0
      ? "Out of Stock"
      : selectedVariant.stock <= selectedVariant.lowStockThreshold
        ? `Only ${selectedVariant.stock} left`
        : "In Stock";

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: product.reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          ...(product.categories[0] ? [{ label: product.categories[0].name, href: `/category/${product.categories[0].slug}` }] : []),
          { label: product.title },
        ]}
      />

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <button
            onClick={() => setLightboxOpen(true)}
            className="block aspect-square w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-neutral-800"
          >
            {displayImages[activeImageIndex] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayImages[activeImageIndex].filePath} alt={product.title} className="h-full w-full object-cover" />
            )}
          </button>
          {displayImages.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {displayImages.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImageIndex(i)}
                  className={cn(
                    "aspect-square overflow-hidden rounded-md border-2",
                    i === activeImageIndex ? "border-black dark:border-white" : "border-transparent"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.filePath} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{product.title}</h1>

          <div className="mt-2 flex items-center gap-2">
            <PriceDisplay basePrice={effectivePrice} salePrice={effectiveSalePrice} size="lg" />
          </div>

          {product.reviews.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500 dark:text-neutral-400">
              <div className="flex items-center text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn("h-4 w-4", i < Math.round(product.avgRating) && "fill-current")} />
                ))}
              </div>
              {product.avgRating.toFixed(1)} ({product.reviews.length} reviews)
            </div>
          )}

          {product.shortDescription && (
            <p className="mt-3 text-sm text-gray-600 dark:text-neutral-300">{product.shortDescription}</p>
          )}

          {sizes.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Size</p>
                <button onClick={() => setSizeChartOpen(true)} className="flex items-center gap-1 text-xs text-gray-500 hover:underline">
                  <Ruler className="h-3.5 w-3.5" /> Size Chart
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const available = isSizeAvailable(size);
                  return (
                    <button
                      key={size}
                      disabled={!available}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        "min-w-[2.5rem] rounded-md border px-3 py-1.5 text-sm",
                        selectedSize === size
                          ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                          : "border-gray-300 text-gray-700 dark:border-neutral-700 dark:text-neutral-300",
                        !available && "cursor-not-allowed opacity-40"
                      )}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {colors.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Color {selectedColor && <span className="text-gray-400">— {selectedColor}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {colors.map(([color, hex]) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    title={color}
                    className={cn(
                      "h-8 w-8 rounded-full border-2",
                      selectedColor === color ? "border-black dark:border-white" : "border-gray-200 dark:border-neutral-700"
                    )}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          )}

          <p
            className={cn(
              "mt-4 text-sm font-medium",
              stockLabel === "Out of Stock" ? "text-red-600" : stockLabel === "In Stock" ? "text-green-600" : "text-amber-600"
            )}
          >
            {stockLabel}
          </p>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center rounded-md border border-gray-300 dark:border-neutral-700">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-3 py-1.5 text-gray-600 dark:text-neutral-300">
                −
              </button>
              <span className="w-8 text-center text-sm">{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} className="px-3 py-1.5 text-gray-600 dark:text-neutral-300">
                +
              </button>
            </div>
            <Button
              onClick={handleAddToCart}
              disabled={!selectedVariant || selectedVariant.stock === 0}
              className="flex-1"
            >
              Add to Cart
            </Button>
            <button
              onClick={toggleWishlist}
              aria-label="Toggle wishlist"
              className="rounded-md border border-gray-300 p-2.5 text-gray-600 hover:text-red-500 dark:border-neutral-700 dark:text-neutral-300"
            >
              <Heart className={cn("h-5 w-5", wishlisted && "fill-red-500 text-red-500")} />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 dark:text-neutral-400">
            <button onClick={shareWhatsApp} className="flex items-center gap-1 hover:underline">
              <Share2 className="h-4 w-4" /> Share
            </button>
            <button onClick={copyLink} className="hover:underline">
              Copy link
            </button>
          </div>

          <div className="mt-8">
            <Tabs
              tabs={[
                {
                  key: "description",
                  label: "Description",
                  content: <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} />,
                },
                {
                  key: "info",
                  label: "Additional Info",
                  content: (
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-neutral-300">
                      {product.weight && <li>Weight: {product.weight}{product.weightUnit}</li>}
                      {product.hsnCode && <li>HSN Code: {product.hsnCode}</li>}
                      <li>SKU: {selectedVariant?.sku}</li>
                    </ul>
                  ),
                },
                {
                  key: "reviews",
                  label: `Reviews (${product.reviews.length})`,
                  content: (
                    <div className="space-y-4">
                      {ratingDistribution.map((r) => (
                        <div key={r.star} className="flex items-center gap-2 text-xs">
                          <span className="w-8 text-gray-500">{r.star} star</span>
                          <div className="h-2 flex-1 rounded-full bg-gray-100 dark:bg-neutral-800">
                            <div
                              className="h-2 rounded-full bg-amber-500"
                              style={{ width: `${product.reviews.length ? (r.count / product.reviews.length) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="w-6 text-gray-400">{r.count}</span>
                        </div>
                      ))}

                      <div className="space-y-3 border-t border-gray-100 pt-4 dark:border-neutral-800">
                        {product.reviews.map((r) => (
                          <div key={r.id} className="border-b border-gray-100 pb-3 last:border-0 dark:border-neutral-800">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{r.userName}</span>
                              <div className="flex text-amber-500">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={cn("h-3 w-3", i < r.rating && "fill-current")} />
                                ))}
                              </div>
                            </div>
                            {r.title && <p className="mt-1 text-sm font-medium text-gray-800 dark:text-neutral-200">{r.title}</p>}
                            {r.comment && <p className="text-sm text-gray-600 dark:text-neutral-300">{r.comment}</p>}
                            {r.adminReply && (
                              <p className="mt-1 rounded bg-gray-50 p-2 text-xs text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">
                                <strong>Store reply:</strong> {r.adminReply}
                              </p>
                            )}
                          </div>
                        ))}
                        {product.reviews.length === 0 && <p className="text-sm text-gray-400">No reviews yet</p>}
                      </div>

                      {session?.user && (
                        <div className="space-y-2 border-t border-gray-100 pt-4 dark:border-neutral-800">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Write a Review</p>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button key={star} onClick={() => setReviewForm((f) => ({ ...f, rating: star }))}>
                                <Star
                                  className={cn(
                                    "h-5 w-5",
                                    star <= reviewForm.rating ? "fill-amber-500 text-amber-500" : "text-gray-300"
                                  )}
                                />
                              </button>
                            ))}
                          </div>
                          <input
                            placeholder="Title"
                            value={reviewForm.title}
                            onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))}
                            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                          />
                          <textarea
                            placeholder="Your review"
                            value={reviewForm.comment}
                            onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                            rows={3}
                            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                          />
                          <Button size="sm" onClick={submitReview} loading={submittingReview}>
                            <Check className="h-3.5 w-3.5" /> Submit Review
                          </Button>
                        </div>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>

      {product.relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">You May Also Like</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {product.relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {recentlyViewed.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Recently Viewed</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {recentlyViewed.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <Modal open={lightboxOpen} onClose={() => setLightboxOpen(false)} title={product.title} size="xl">
        {displayImages[activeImageIndex] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayImages[activeImageIndex].filePath} alt={product.title} className="w-full rounded-md" />
        )}
      </Modal>

      <Modal open={sizeChartOpen} onClose={() => setSizeChartOpen(false)} title="Size Chart">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 dark:border-neutral-800">
              <th className="py-1.5">Size</th>
              <th className="py-1.5">Chest (in)</th>
              <th className="py-1.5">Length (in)</th>
            </tr>
          </thead>
          <tbody>
            {[
              { size: "S", chest: 36, length: 27 },
              { size: "M", chest: 38, length: 28 },
              { size: "L", chest: 40, length: 29 },
              { size: "XL", chest: 42, length: 30 },
              { size: "XXL", chest: 44, length: 31 },
            ].map((row) => (
              <tr key={row.size} className="border-b border-gray-100 last:border-0 dark:border-neutral-800/50">
                <td className="py-1.5">{row.size}</td>
                <td className="py-1.5">{row.chest}</td>
                <td className="py-1.5">{row.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>
    </div>
  );
}
