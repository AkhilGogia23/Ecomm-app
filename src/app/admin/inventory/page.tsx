"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { History, Upload as UploadIcon, Check, X, Pencil } from "lucide-react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Select from "@/components/ui/Select";
import SearchInput from "@/components/ui/SearchInput";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import FileUpload from "@/components/ui/FileUpload";
import Modal from "@/components/ui/Modal";
import { Card, CardBody } from "@/components/ui/Card";
import { toast } from "@/store/toast";

interface VariantRow {
  id: string;
  productId: string;
  productTitle: string;
  sku: string;
  size: string | null;
  color: string | null;
  stock: number;
  reservedStock: number;
  available: number;
  lowStockThreshold: number;
  status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "error"> = {
  IN_STOCK: "success",
  LOW_STOCK: "warning",
  OUT_OF_STOCK: "error",
};

export default function AdminInventoryPage() {
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ successCount: number; errorCount: number; errors: { row: number; message: string }[] } | null>(null);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("filter", filter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/inventory?${params.toString()}`);
      const json = await res.json();
      if (json.success) setVariants(json.data);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on filter change
    fetchInventory();
  }, [fetchInventory]);

  function startEdit(row: VariantRow) {
    setEditingId(row.id);
    setEditValue(String(row.stock));
  }

  async function saveEdit(row: VariantRow) {
    const newStock = Number(editValue);
    if (Number.isNaN(newStock) || newStock < 0) {
      toast.error("Enter a valid stock number");
      return;
    }
    const res = await fetch(`/api/admin/inventory/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStock, reason: "Manual adjustment via inventory dashboard" }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Stock updated");
      setEditingId(null);
      fetchInventory();
    } else {
      toast.error(json.error ?? "Failed to update stock");
    }
  }

  function handleBulkFile(files: File[]) {
    const file = files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const res = await fetch("/api/admin/inventory/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: results.data }),
        });
        const json = await res.json();
        if (json.success) {
          setBulkResult(json.data);
          fetchInventory();
        } else {
          toast.error(json.error ?? "Bulk update failed");
        }
      },
    });
  }

  function downloadTemplate() {
    window.open("/api/admin/products/bulk-upload/template?type=inventory", "_blank");
  }

  const columns: Column<VariantRow>[] = [
    { key: "product", header: "Product", render: (row) => row.productTitle },
    { key: "sku", header: "SKU", render: (row) => row.sku },
    { key: "size", header: "Size", render: (row) => row.size ?? "—" },
    { key: "color", header: "Color", render: (row) => row.color ?? "—" },
    {
      key: "stock",
      header: "Stock",
      render: (row) =>
        editingId === row.id ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-16 rounded border border-gray-300 px-1.5 py-0.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
            <button onClick={() => saveEdit(row)} className="text-green-600" aria-label="Save">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={() => setEditingId(null)} className="text-gray-400" aria-label="Cancel">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => startEdit(row)} className="flex items-center gap-1 hover:underline">
            {row.stock} <Pencil className="h-3 w-3 text-gray-400" />
          </button>
        ),
    },
    { key: "reserved", header: "Reserved", render: (row) => row.reservedStock },
    { key: "available", header: "Available", render: (row) => row.available },
    { key: "threshold", header: "Threshold", render: (row) => row.lowStockThreshold },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status.replace(/_/g, " ")}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{variants.length} variants</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/inventory/log">
            <Button variant="outline">
              <History className="h-4 w-4" /> Adjustment Log
            </Button>
          </Link>
          <Button onClick={() => setBulkModalOpen(true)}>
            <UploadIcon className="h-4 w-4" /> Bulk Update
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        <SearchInput value={search} onSearch={setSearch} placeholder="Search by SKU or product..." className="w-64" />
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="All stock levels"
          options={[
            { label: "Low stock only", value: "low_stock" },
            { label: "Out of stock only", value: "out_of_stock" },
          ]}
          className="w-48"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <DataTable columns={columns} data={variants} rowKey={(row) => row.id} loading={loading} emptyTitle="No variants found" />
      </div>

      <Modal
        open={bulkModalOpen}
        onClose={() => {
          setBulkModalOpen(false);
          setBulkResult(null);
        }}
        title="Bulk Stock Update"
      >
        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            Download CSV Template
          </Button>
          <FileUpload onFilesAccepted={handleBulkFile} accept={{ "text/csv": [".csv"] }} multiple={false} />
          {bulkResult && (
            <Card>
              <CardBody className="space-y-2 text-sm">
                <p className="text-green-600 dark:text-green-400">{bulkResult.successCount} updated</p>
                <p className="text-red-600 dark:text-red-400">{bulkResult.errorCount} errors</p>
                {bulkResult.errors.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-xs text-gray-500">
                    Row {e.row}: {e.message}
                  </p>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      </Modal>
    </div>
  );
}
