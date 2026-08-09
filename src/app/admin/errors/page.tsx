"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { toast } from "@/store/toast";

interface ErrorRow {
  id: string;
  level: string;
  message: string;
  stack: string | null;
  endpoint: string | null;
  method: string | null;
  requestBody: string | null;
  createdAt: string;
}

const LEVEL_VARIANT: Record<string, "error" | "warning" | "info"> = {
  ERROR: "error",
  WARN: "warning",
  INFO: "info",
};

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailTarget, setDetailTarget] = useState<ErrorRow | null>(null);
  const [cleanupOpen, setCleanupOpen] = useState(false);

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/errors?page=${page}`);
      const json = await res.json();
      if (json.success) {
        setErrors(json.data);
        setTotalPages(json.meta?.totalPages ?? 1);
        setTotal(json.meta?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on page change
    fetchErrors();
  }, [fetchErrors]);

  async function handleCleanup() {
    const res = await fetch("/api/admin/errors?daysOld=30", { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success(`Deleted ${json.data.count} old error(s)`);
      setCleanupOpen(false);
      fetchErrors();
    } else {
      toast.error(json.error ?? "Failed to clean up errors");
    }
  }

  const columns: Column<ErrorRow>[] = [
    { key: "date", header: "Timestamp", render: (row) => new Date(row.createdAt).toLocaleString() },
    { key: "level", header: "Level", render: (row) => <Badge variant={LEVEL_VARIANT[row.level] ?? "default"}>{row.level}</Badge> },
    { key: "message", header: "Message", render: (row) => <span className="truncate">{row.message.slice(0, 80)}</span> },
    { key: "endpoint", header: "Endpoint", render: (row) => row.endpoint ?? "—" },
    { key: "method", header: "Method", render: (row) => row.method ?? "—" },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <button onClick={() => setDetailTarget(row)} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
          View details
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Error Log</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{total} logged errors</p>
        </div>
        <Button variant="destructive" onClick={() => setCleanupOpen(true)}>
          <Trash2 className="h-4 w-4" /> Delete errors older than 30 days
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <DataTable columns={columns} data={errors} rowKey={(row) => row.id} loading={loading} emptyTitle="No errors logged" />
        <Pagination page={page} totalPages={totalPages} total={total} limit={50} onPageChange={setPage} />
      </div>

      <Modal open={!!detailTarget} onClose={() => setDetailTarget(null)} title="Error Details" size="xl">
        {detailTarget && (
          <div className="space-y-3">
            <p className="text-sm text-gray-900 dark:text-white">{detailTarget.message}</p>
            {detailTarget.stack && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-neutral-400">Stack Trace</p>
                <pre className="max-h-64 overflow-auto rounded-md bg-gray-50 p-3 text-xs dark:bg-neutral-800">{detailTarget.stack}</pre>
              </div>
            )}
            {detailTarget.requestBody && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-neutral-400">Request Body</p>
                <pre className="max-h-48 overflow-auto rounded-md bg-gray-50 p-3 text-xs dark:bg-neutral-800">{detailTarget.requestBody}</pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={cleanupOpen}
        title="Delete old errors"
        description="This will permanently delete all error log entries older than 30 days."
        confirmLabel="Delete"
        onConfirm={handleCleanup}
        onCancel={() => setCleanupOpen(false)}
      />
    </div>
  );
}
