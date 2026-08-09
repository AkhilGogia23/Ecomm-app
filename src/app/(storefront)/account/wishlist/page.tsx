"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useCartStore } from "@/store/cart";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import PriceDisplay from "@/components/storefront/PriceDisplay";
import { toast } from "@/store/toast";

interface WishlistItem {
  id: string;
  productId: string;
  product: {
    id: string;
    title: string;
    slug: string;
    basePrice: number;
    salePrice: number | null;
    images: { filePath: string }[];
  };
}

export default function AccountWishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wishlist");
      const json = await res.json();
      if (json.success) setItems(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    fetchWishlist();
  }, [fetchWishlist]);

  async function remove(productId: string) {
    const res = await fetch("/api/wishlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Removed from wishlist");
      fetchWishlist();
    }
  }

  function addToCart(item: WishlistItem) {
    addItem({
      productId: item.product.id,
      variantId: null,
      title: item.product.title,
      slug: item.product.slug,
      image: item.product.images[0]?.filePath ?? null,
      price: item.product.basePrice,
      salePrice: item.product.salePrice,
      size: null,
      color: null,
      quantity: 1,
      stock: 99,
    });
    toast.success("Added to cart");
  }

  if (loading) return <Skeleton className="h-64 w-full" />;

  if (items.length === 0) {
    return <EmptyState title="Your wishlist is empty" description="Save items you love to view them here later." />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">My Wishlist</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="relative rounded-lg border border-gray-200 p-3 dark:border-neutral-800">
            <button
              onClick={() => remove(item.productId)}
              className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-gray-500 hover:text-red-500 dark:bg-neutral-900/90"
              aria-label="Remove from wishlist"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <Link href={`/product/${item.product.slug}`}>
              <div className="aspect-square overflow-hidden rounded-md bg-gray-100 dark:bg-neutral-800">
                {item.product.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.product.images[0].filePath} alt={item.product.title} className="h-full w-full object-cover" />
                )}
              </div>
              <p className="mt-2 truncate text-sm text-gray-800 dark:text-neutral-200">{item.product.title}</p>
              <PriceDisplay basePrice={item.product.basePrice} salePrice={item.product.salePrice} size="sm" />
            </Link>
            <Button size="sm" className="mt-2 w-full" onClick={() => addToCart(item)}>
              Add to Cart
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
