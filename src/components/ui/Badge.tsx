import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "success" | "warning" | "error" | "info" | "default";

const variantClasses: Record<Variant, string> = {
  success:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  error: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  default: "bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-neutral-300",
};

export default function Badge({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
