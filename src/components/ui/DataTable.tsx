"use client";

import { ReactNode, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import Skeleton from "./Skeleton";
import EmptyState from "./EmptyState";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  selectable?: boolean;
  bulkActions?: (selectedIds: string[], clearSelection: () => void) => ReactNode;
  onSort?: (key: string, direction: "asc" | "desc") => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  loading,
  selectable,
  bulkActions,
  onSort,
  sortKey,
  sortDirection,
  emptyTitle = "No records found",
  emptyDescription,
}: DataTableProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleAll() {
    if (selected.size === data.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.map(rowKey)));
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSort(col: Column<T>) {
    if (!col.sortable || !onSort) return;
    const nextDirection = sortKey === col.key && sortDirection === "asc" ? "desc" : "asc";
    onSort(col.key, nextDirection);
  }

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const selectedIds = Array.from(selected);

  return (
    <div className="w-full">
      {selectable && selectedIds.length > 0 && bulkActions && (
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-neutral-800 dark:bg-neutral-800/50">
          <span className="text-sm text-gray-600 dark:text-neutral-300">
            {selectedIds.length} selected
          </span>
          <div className="flex gap-2">{bulkActions(selectedIds, () => setSelected(new Set()))}</div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 dark:border-neutral-800 dark:text-neutral-400">
              {selectable && (
                <th className="w-10 px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selected.size === data.length && data.length > 0}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-2 font-medium",
                    col.sortable && "cursor-pointer select-none",
                    col.className
                  )}
                  onClick={() => handleSort(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const id = rowKey(row);
              return (
                <tr
                  key={id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
                >
                  {selectable && (
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(id)}
                        onChange={() => toggleRow(id)}
                        aria-label={`Select row ${id}`}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-2.5 text-gray-800 dark:text-neutral-200", col.className)}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="divide-y divide-gray-100 dark:divide-neutral-800 md:hidden">
        {data.map((row) => {
          const id = rowKey(row);
          return (
            <div key={id} className="space-y-1 px-4 py-3">
              {selectable && (
                <input
                  type="checkbox"
                  checked={selected.has(id)}
                  onChange={() => toggleRow(id)}
                  aria-label={`Select row ${id}`}
                  className="mb-1"
                />
              )}
              {columns.map((col) => (
                <div key={col.key} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-neutral-400">{col.header}</span>
                  <span className="text-gray-800 dark:text-neutral-200">{col.render(row)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
