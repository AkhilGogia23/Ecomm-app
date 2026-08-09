"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";

interface AdjustmentRow {
  id: string;
  previousStock: number;
  newStock: number;
  adjustmentQty: number;
  reason: string;
  createdAt: string;
  variant: { sku: string; size: string | null; color: string | null; product: { title: string } };
  adjustedBy: { name: string; email: string };
}

export default function InventoryLogPage() {
  const [logs, setLogs] = useState<AdjustmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/inventory/log?page=${page}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
        setTotalPages(json.meta?.totalPages ?? 1);
        setTotal(json.meta?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on page change
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/inventory" className="mb-1 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:text-neutral-400">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to inventory
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Stock Adjustment Log</h1>
        <p className="text-sm text-gray-500 dark:text-neutral-400">{total} adjustments recorded</p>
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <EmptyState title="No stock adjustments yet" />
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">Product</th>
                  <th className="px-5 py-2 font-medium">SKU</th>
                  <th className="px-5 py-2 font-medium">Change</th>
                  <th className="px-5 py-2 font-medium">Reason</th>
                  <th className="px-5 py-2 font-medium">By</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 last:border-0 dark:border-neutral-800/50">
                    <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-2.5 font-medium text-gray-900 dark:text-white">
                      {log.variant.product.title}
                    </td>
                    <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{log.variant.sku}</td>
                    <td className="px-5 py-2.5">
                      <span className={log.adjustmentQty >= 0 ? "text-green-600" : "text-red-600"}>
                        {log.adjustmentQty >= 0 ? "+" : ""}
                        {log.adjustmentQty}
                      </span>{" "}
                      <span className="text-gray-400">
                        ({log.previousStock} → {log.newStock})
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{log.reason}</td>
                    <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{log.adjustedBy?.name ?? "System"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Pagination page={page} totalPages={totalPages} total={total} limit={50} onPageChange={setPage} />
        </CardBody>
      </Card>
    </div>
  );
}
