"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import PriceDisplay from "./PriceDisplay";
import { toast } from "@/store/toast";
import { cn } from "@/lib/cn";

export interface ProductCardData {
  id: string;
  title: string;
  slug: string;
  basePrice: number;
  salePrice: number | null;
  isNewArrival?: boolean;
  isBestseller?: boolean;
  images: { filePath: string; thumbPath: string | null }[];
}

export default function ProductCard({ product }: { product: ProductCardData }) {
  const { data: session } = useSession();
  const [wishlisted, setWishlisted] = useState(false);
  const [busy, setBusy] = useState(false);

  const primaryImage = product.images[0]?.thumbPath ?? product.images[0]?.filePath;
  const secondaryImage = product.images[1]?.thumbPath ?? product.images[1]?.filePath;

  async function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    if (!session?.user) {
      toast.error("Sign in to save items to your wishlist");
      return;
    }
    setBusy(true);
    try {
      const method = wishlisted ? "DELETE" : "POST";
      const res = await fetch(`/api/wishlist`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      const json = await res.json();
      if (json.success) {
        setWishlisted(!wishlisted);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-100 dark:bg-neutral-800">
        {primaryImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryImage}
            alt={product.title}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-300",
              secondaryImage && "group-hover:opacity-0"
            )}
          />
        )}
        {secondaryImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={secondaryImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}

        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.isNewArrival && (
            <span className="rounded bg-black px-2 py-0.5 text-[10px] font-medium text-white dark:bg-white dark:text-black">
              NEW
            </span>
          )}
          {product.salePrice && (
            <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-medium text-white">SALE</span>
          )}
        </div>

        <button
          onClick={toggleWishlist}
          disabled={busy}
          aria-label="Toggle wishlist"
          className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-gray-700 shadow-sm hover:text-red-500 dark:bg-neutral-900/90 dark:text-neutral-300"
        >
          <Heart className={cn("h-4 w-4", wishlisted && "fill-red-500 text-red-500")} />
        </button>
      </div>

      <div className="mt-2">
        <h3 className="truncate text-sm text-gray-800 dark:text-neutral-200">{product.title}</h3>
        <PriceDisplay basePrice={product.basePrice} salePrice={product.salePrice} size="sm" className="mt-0.5" />
      </div>
    </Link>
  );
}
