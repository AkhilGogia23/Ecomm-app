import { Suspense } from "react";
import ShopGrid from "@/components/storefront/shop/ShopGrid";

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">Shop All</h1>
      <Suspense fallback={null}>
        <ShopGrid />
      </Suspense>
    </div>
  );
}
