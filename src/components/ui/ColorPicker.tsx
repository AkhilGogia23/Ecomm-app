"use client";

import { cn } from "@/lib/cn";

interface ColorPickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function ColorPicker({ label, value, onChange, className }: ColorPickerProps) {
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label ?? "Pick a color"}
          className="h-9 w-9 cursor-pointer rounded-md border border-gray-300 bg-transparent p-0.5 dark:border-neutral-700"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="w-28 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-white"
        />
      </div>
    </div>
  );
}
