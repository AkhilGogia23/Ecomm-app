import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-gray-500 dark:text-neutral-400">
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          {i > 0 && <ChevronRight className="mx-1.5 h-3.5 w-3.5" />}
          {item.href && i !== items.length - 1 ? (
            <Link href={item.href} className="hover:text-gray-900 dark:hover:text-white">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 dark:text-white">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
