"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { Plus, Pencil, Copy, Trash2, Download, Upload, ImagePlus } from "lucide-react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Select from "@/components/ui/Select";
import SearchInput from "@/components/ui/SearchInput";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatPrice } from "@/lib/utils/price";
import { toast } from "@/store/toast";

interface ProductRow {
  id: string;
  title: string;
  slug: string;
  sku: string;
  basePrice: number;
  salePrice: number | null;
  status: string;
  thumbnail: string | null;
  imageCount: number;
  variantCount: number;
  totalStock: number;
  categoryNames: string[];
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  level: number;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
  ACTIVE: "success",
  DRAFT: "default",
  ARCHIVED: "warning",
  OUT_OF_STOCK: "error",
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const limit = 20;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort: "newest",
      });
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setProducts(json.data);
        setTotalPages(json.meta?.totalPages ?? 1);
        setTotal(json.meta?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, status, category, search]);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCategories(json.data);
      });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount/filter change
    fetchProducts();
  }, [fetchProducts]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Product deleted");
        setDeleteTarget(null);
        fetchProducts();
      } else {
        toast.error(json.error ?? "Failed to delete product");
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleDuplicate(id: string) {
    const res = await fetch(`/api/admin/products/${id}/duplicate`, { method: "POST" });
    const json = await res.json();
    if (json.success) {
      toast.success("Product duplicated");
      fetchProducts();
    } else {
      toast.error(json.error ?? "Failed to duplicate product");
    }
  }

  async function handleExportCsv() {
    const res = await fetch(`/api/admin/products?limit=1000&sort=newest`);
    const json = await res.json();
    if (!json.success) {
      toast.error("Failed to export products");
      return;
    }
    const rows = (json.data as ProductRow[]).map((p) => ({
      title: p.title,
      sku: p.sku,
      base_price: p.basePrice,
      sale_price: p.salePrice ?? "",
      status: p.status,
      total_stock: p.totalStock,
      categories: p.categoryNames.join("|"),
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: Column<ProductRow>[] = [
    {
      key: "image",
      header: "Image",
      render: (row) => (
        <div className="h-10 w-10 overflow-hidden rounded-md bg-gray-100 dark:bg-neutral-800">
          {row.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.thumbnail} alt={row.title} className="h-full w-full object-cover" />
          )}
        </div>
      ),
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{row.title}</p>
          <p className="text-xs text-gray-500 dark:text-neutral-400">{row.categoryNames.join(", ")}</p>
        </div>
      ),
    },
    { key: "sku", header: "SKU", render: (row) => row.sku },
    {
      key: "price",
      header: "Price",
      render: (row) => (
        <div>
          {row.salePrice ? (
            <>
              <span className="font-medium text-gray-900 dark:text-white">{formatPrice(row.salePrice)}</span>{" "}
              <span className="text-xs text-gray-400 line-through">{formatPrice(row.basePrice)}</span>
            </>
          ) : (
            <span className="font-medium text-gray-900 dark:text-white">{formatPrice(row.basePrice)}</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge variant={STATUS_VARIANT[row.status] ?? "default"}>{row.status}</Badge>,
    },
    {
      key: "stock",
      header: "Stock",
      render: (row) => (
        <span className={row.totalStock === 0 ? "text-red-600 dark:text-red-400" : ""}>{row.totalStock}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/admin/products/${row.id}/edit`}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            aria-label={`Edit ${row.title}`}
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            onClick={() => handleDuplicate(row.id)}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            aria-label={`Duplicate ${row.title}`}
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
            aria-label={`Delete ${row.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  async function handleBulkDelete(ids: string[], clearSelection: () => void) {
    await Promise.all(ids.map((id) => fetch(`/api/admin/products/${id}`, { method: "DELETE" })));
    toast.success(`${ids.length} product(s) deleted`);
    clearSelection();
    fetchProducts();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Products</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{total} total products</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/products/bulk-upload">
            <Button variant="outline">
              <Upload className="h-4 w-4" /> Import Products
            </Button>
          </Link>
          <Link href="/admin/products/bulk-images">
            <Button variant="outline">
              <ImagePlus className="h-4 w-4" /> Bulk Images
            </Button>
          </Link>
          <Button variant="outline" onClick={handleExportCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Link href="/admin/products/new">
            <Button>
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        <SearchInput
          value={search}
          onSearch={(v) => {
            setPage(1);
            setSearch(v);
          }}
          placeholder="Search by title or SKU..."
          className="w-64"
        />
        <Select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          placeholder="All statuses"
          options={[
            { label: "Draft", value: "DRAFT" },
            { label: "Active", value: "ACTIVE" },
            { label: "Archived", value: "ARCHIVED" },
            { label: "Out of Stock", value: "OUT_OF_STOCK" },
          ]}
          className="w-40"
        />
        <Select
          value={category}
          onChange={(e) => {
            setPage(1);
            setCategory(e.target.value);
          }}
          placeholder="All categories"
          options={categories.map((c) => ({
            label: c.level > 0 ? `— ${c.name}` : c.name,
            value: c.slug,
          }))}
          className="w-48"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <DataTable
          columns={columns}
          data={products}
          rowKey={(row) => row.id}
          loading={loading}
          selectable
          bulkActions={(ids, clear) => (
            <Button variant="destructive" size="sm" onClick={() => handleBulkDelete(ids, clear)}>
              Delete selected
            </Button>
          )}
          emptyTitle="No products found"
          emptyDescription="Try adjusting your filters or add a new product."
        />
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete product"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This can be recovered from the database if needed.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
