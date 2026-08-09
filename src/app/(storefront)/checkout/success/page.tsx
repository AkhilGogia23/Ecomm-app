"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
      <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">Order Confirmed!</h1>
      {orderNumber && (
        <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">
          Your order number is <strong className="text-gray-900 dark:text-white">{orderNumber}</strong>
        </p>
      )}
      <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
        We&apos;ve sent a confirmation email with your order details. Estimated delivery in 4-7 business days.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/shop">
          <Button variant="outline">Continue Shopping</Button>
        </Link>
        <Link href="/account/orders">
          <Button>View My Orders</Button>
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}
