"use client";

import { useEffect, useState } from "react";
import { SIZES } from "@/lib/constants";

export interface Filters {
  category: string;
  sizes: string[];
  colors: string[];
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level: number;
}

interface FilterSidebarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  hideCategoryFilter?: boolean;
}

const COMMON_COLORS = ["Black", "White", "Blue", "Red", "Green", "Beige", "Maroon", "Indigo"];

export default function FilterSidebar({ filters, onChange, hideCategoryFilter }: FilterSidebarProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (hideCategoryFilter) return;
    fetch("/api/categories")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCategories(json.data);
      });
  }, [hideCategoryFilter]);

  function toggleArrayValue(key: "sizes" | "colors", value: string) {
    const current = filters[key];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onChange({ ...filters, [key]: next });
  }

  return (
    <div className="space-y-6">
      {!hideCategoryFilter && categories.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Category</p>
          <div className="space-y-1">
            {categories.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-neutral-300"
                style={{ paddingLeft: `${c.level * 12}px` }}
              >
                <input
                  type="radio"
                  name="category"
                  checked={filters.category === c.slug}
                  onChange={() => onChange({ ...filters, category: c.slug })}
                />
                {c.name}
              </label>
            ))}
            {filters.category && (
              <button
                onClick={() => onChange({ ...filters, category: "" })}
                className="text-xs text-gray-400 hover:underline"
              >
                Clear category
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Size</p>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => (
            <button
              key={size}
              onClick={() => toggleArrayValue("sizes", size)}
              className={`rounded border px-2.5 py-1 text-xs ${
                filters.sizes.includes(size)
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-gray-300 text-gray-600 dark:border-neutral-700 dark:text-neutral-300"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Color</p>
        <div className="flex flex-wrap gap-2">
          {COMMON_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => toggleArrayValue("colors", color)}
              className={`rounded-full border px-2.5 py-1 text-xs ${
                filters.colors.includes(color)
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-gray-300 text-gray-600 dark:border-neutral-700 dark:text-neutral-300"
              }`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Price Range</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => onChange({ ...filters, minPrice: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => onChange({ ...filters, maxPrice: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-neutral-300">
        <input
          type="checkbox"
          checked={filters.inStock}
          onChange={(e) => onChange({ ...filters, inStock: e.target.checked })}
        />
        In stock only
      </label>
    </div>
  );
}
