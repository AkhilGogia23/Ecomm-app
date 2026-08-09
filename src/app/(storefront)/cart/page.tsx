"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/cart";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/utils/price";
import { toast } from "@/store/toast";

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, totalPrice } = useCartStore();
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{ code: string; discount: number } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const subtotal = totalPrice();
  const discount = couponResult?.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, cartTotal: subtotal }),
      });
      const json = await res.json();
      if (json.success) {
        setCouponResult({ code: json.data.code, discount: json.data.discount });
        toast.success(`Coupon "${json.data.code}" applied`);
      } else {
        toast.error(json.error ?? "Invalid coupon code");
        setCouponResult(null);
      }
    } finally {
      setApplyingCoupon(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title="Your cart is empty"
          description="Looks like you haven't added anything yet."
          action={
            <Link href="/shop">
              <Button>Start Shopping</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">Your Cart</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <div key={`${item.productId}-${item.variantId}`} className="flex gap-4 rounded-lg border border-gray-200 p-4 dark:border-neutral-800">
              <div className="h-24 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-neutral-800">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <Link href={`/product/${item.slug}`} className="text-sm font-medium text-gray-900 hover:underline dark:text-white">
                  {item.title}
                </Link>
                <p className="text-xs text-gray-500 dark:text-neutral-400">
                  {item.size && `Size: ${item.size}`} {item.color && `· Color: ${item.color}`}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                      className="rounded border border-gray-300 p-1 dark:border-neutral-700"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                      className="rounded border border-gray-300 p-1 dark:border-neutral-700"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatPrice((item.salePrice ?? item.price) * item.quantity)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => removeItem(item.productId, item.variantId)}
                className="text-gray-400 hover:text-red-500"
                aria-label={`Remove ${item.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Link href="/shop" className="inline-block text-sm text-gray-500 hover:underline dark:text-neutral-400">
            ← Continue Shopping
          </Link>
        </div>

        <div className="h-fit rounded-lg border border-gray-200 p-5 dark:border-neutral-800">
          <h2 className="mb-4 font-medium text-gray-900 dark:text-white">Order Summary</h2>

          <div className="mb-4 flex gap-2">
            <Input placeholder="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="flex-1" />
            <Button variant="outline" onClick={applyCoupon} loading={applyingCoupon}>
              Apply
            </Button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-neutral-400">Subtotal</span>
              <span className="text-gray-900 dark:text-white">{formatPrice(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({couponResult?.code})</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-neutral-400">Shipping</span>
              <span className="text-gray-400">Calculated at checkout</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900 dark:border-neutral-800 dark:text-white">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <Button
            className="mt-4 w-full"
            onClick={() => {
              if (couponResult) sessionStorage.setItem("applied-coupon", couponResult.code);
              router.push("/checkout");
            }}
          >
            Proceed to Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
