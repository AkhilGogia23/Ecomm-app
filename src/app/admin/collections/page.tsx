"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import FileUpload from "@/components/ui/FileUpload";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { toast } from "@/store/toast";

interface CollectionRow {
  id: string;
  name: string;
  slug: string;
  type: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  imagePath: string | null;
  _count: { products: number };
}

interface FormState {
  id?: string;
  name: string;
  description: string;
  type: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  imagePath: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  type: "MANUAL",
  isActive: true,
  startDate: "",
  endDate: "",
  imagePath: "",
};

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CollectionRow | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/collections");
      const json = await res.json();
      if (json.success) setCollections(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    fetchCollections();
  }, [fetchCollections]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  async function handleImageUpload(files: File[]) {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "collections");
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        setForm((prev) => ({ ...prev, imagePath: json.data.path }));
      } else {
        toast.error(json.error ?? "Failed to upload image");
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        type: form.type,
        isActive: form.isActive,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        imagePath: form.imagePath || undefined,
      };

      const url = form.id ? `/api/admin/collections/${form.id}` : "/api/admin/collections";
      const method = form.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(form.id ? "Collection updated" : "Collection created");
        setModalOpen(false);
        fetchCollections();
      } else {
        toast.error(json.error ?? "Failed to save collection");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/collections/${deleteTarget.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Collection deleted");
      setDeleteTarget(null);
      fetchCollections();
    } else {
      toast.error(json.error ?? "Failed to delete collection");
    }
  }

  const columns: Column<CollectionRow>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <Link href={`/admin/collections/${row.id}`} className="font-medium text-gray-900 hover:underline dark:text-white">
          {row.name}
        </Link>
      ),
    },
    { key: "type", header: "Type", render: (row) => row.type },
    { key: "products", header: "Products", render: (row) => row._count.products },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge variant={row.isActive ? "success" : "default"}>{row.isActive ? "Active" : "Inactive"}</Badge>,
    },
    {
      key: "dates",
      header: "Date Range",
      render: (row) =>
        row.startDate || row.endDate
          ? `${row.startDate ? new Date(row.startDate).toLocaleDateString() : "…"} - ${row.endDate ? new Date(row.endDate).toLocaleDateString() : "…"}`
          : "—",
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <button
          onClick={() => setDeleteTarget(row)}
          className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
          aria-label={`Delete ${row.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Collections</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{collections.length} total collections</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Collection
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <DataTable
          columns={columns}
          data={collections}
          rowKey={(row) => row.id}
          loading={loading}
          emptyTitle="No collections yet"
          emptyDescription="Create a collection to group products together."
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Collection"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            options={[
              { label: "Manual", value: "MANUAL" },
              { label: "Automated", value: "AUTOMATED" },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
            />
            <Input
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">Image</label>
            <FileUpload onFilesAccepted={handleImageUpload} multiple={false} />
            {uploading && <p className="mt-1 text-xs text-gray-500">Uploading...</p>}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
            />
            Active
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete collection"
        description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
