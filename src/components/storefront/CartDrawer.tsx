"use client";

import Link from "next/link";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils/price";
import Button from "@/components/ui/Button";

export default function CartDrawer() {
  const { items, isOpen, close, removeItem, updateQuantity, totalPrice } = useCartStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={close} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Cart ({items.length})</h2>
          <button onClick={close} aria-label="Close cart" className="text-gray-500 hover:text-gray-800 dark:text-neutral-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-sm text-gray-500 dark:text-neutral-400">Your cart is empty</p>
              <Button className="mt-4" onClick={close}>
                <Link href="/shop">Start Shopping</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={`${item.productId}-${item.variantId}`} className="flex gap-3">
                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-neutral-800">
                    {item.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
                    <p className="text-xs text-gray-500 dark:text-neutral-400">
                      {item.size && `Size: ${item.size}`} {item.color && `· ${item.color}`}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                          className="rounded border border-gray-300 p-0.5 text-gray-600 dark:border-neutral-700"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                          className="rounded border border-gray-300 p-0.5 text-gray-600 dark:border-neutral-700"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
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
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-gray-200 px-5 py-4 dark:border-neutral-800">
            <div className="mb-3 flex items-center justify-between text-sm font-medium">
              <span className="text-gray-600 dark:text-neutral-300">Subtotal</span>
              <span className="text-gray-900 dark:text-white">{formatPrice(totalPrice())}</span>
            </div>
            <Link href="/checkout" onClick={close}>
              <Button className="w-full">Proceed to Checkout</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
