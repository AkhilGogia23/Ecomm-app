import { formatPrice, calculateDiscount } from "@/lib/utils/price";
import { cn } from "@/lib/cn";

export default function PriceDisplay({
  basePrice,
  salePrice,
  size = "md",
  className,
}: {
  basePrice: number;
  salePrice?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  if (salePrice && salePrice < basePrice) {
    const discount = calculateDiscount(basePrice, salePrice);
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className={cn("font-semibold text-gray-900 dark:text-white", sizeClasses[size])}>
          {formatPrice(salePrice)}
        </span>
        <span className="text-sm text-gray-400 line-through">{formatPrice(basePrice)}</span>
        <span className="text-xs font-medium text-green-600 dark:text-green-400">{discount}% OFF</span>
      </div>
    );
  }

  return (
    <span className={cn("font-semibold text-gray-900 dark:text-white", sizeClasses[size], className)}>
      {formatPrice(basePrice)}
    </span>
  );
}
