"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { toast } from "@/store/toast";

interface PageRow {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  updatedAt: string;
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<PageRow | null>(null);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pages");
      const json = await res.json();
      if (json.success) setPages(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    fetchPages();
  }, [fetchPages]);

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/pages/${deleteTarget.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Page deleted");
      setDeleteTarget(null);
      fetchPages();
    } else {
      toast.error(json.error ?? "Failed to delete page");
    }
  }

  const columns: Column<PageRow>[] = [
    {
      key: "title",
      header: "Title",
      render: (row) => (
        <Link href={`/admin/pages/${row.id}/edit`} className="font-medium text-gray-900 hover:underline dark:text-white">
          {row.title}
        </Link>
      ),
    },
    { key: "slug", header: "Slug", render: (row) => `/${row.slug}` },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge variant={row.isPublished ? "success" : "default"}>{row.isPublished ? "Published" : "Draft"}</Badge>,
    },
    { key: "updated", header: "Last Updated", render: (row) => new Date(row.updatedAt).toLocaleDateString() },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Link href={`/admin/pages/${row.id}/edit`} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800" aria-label={`Edit ${row.title}`}>
            <Pencil className="h-4 w-4" />
          </Link>
          <button onClick={() => setDeleteTarget(row)} className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950" aria-label={`Delete ${row.title}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Pages</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{pages.length} total pages</p>
        </div>
        <Link href="/admin/pages/new">
          <Button>
            <Plus className="h-4 w-4" /> Add Page
          </Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <DataTable columns={columns} data={pages} rowKey={(row) => row.id} loading={loading} emptyTitle="No pages yet" />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete page"
        description={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
