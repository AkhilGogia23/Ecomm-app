"use client";

import { useState, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
}

export default function Tabs({
  tabs,
  defaultTab,
  onChange,
}: {
  tabs: TabItem[];
  defaultTab?: string;
  onChange?: (key: string) => void;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);

  function select(key: string) {
    setActive(key);
    onChange?.(key);
  }

  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-gray-200 dark:border-neutral-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => select(tab.key)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              active === tab.key
                ? "border-black text-black dark:border-white dark:text-white"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{tabs.find((t) => t.key === active)?.content}</div>
    </div>
  );
}
