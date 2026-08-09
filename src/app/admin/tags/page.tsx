"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Merge } from "lucide-react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { toast } from "@/store/toast";

interface TagRow {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

export default function AdminTagsPage() {
  const [tags, setTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TagRow | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TagRow | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSource, setMergeSource] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");
  const [merging, setMerging] = useState(false);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tags");
      const json = await res.json();
      if (json.success) setTags(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    fetchTags();
  }, [fetchTags]);

  function openCreate() {
    setEditTarget(null);
    setName("");
    setModalOpen(true);
  }

  function openEdit(tag: TagRow) {
    setEditTarget(tag);
    setName(tag.name);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const url = editTarget ? `/api/admin/tags/${editTarget.id}` : "/api/admin/tags";
      const method = editTarget ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editTarget ? "Tag updated" : "Tag created");
        setModalOpen(false);
        fetchTags();
      } else {
        toast.error(json.error ?? "Failed to save tag");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/tags/${deleteTarget.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Tag deleted");
      setDeleteTarget(null);
      fetchTags();
    } else {
      toast.error(json.error ?? "Failed to delete tag");
    }
  }

  async function handleMerge() {
    if (!mergeSource || !mergeTarget) {
      toast.error("Select both tags to merge");
      return;
    }
    setMerging(true);
    try {
      const res = await fetch("/api/admin/tags/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceTagId: mergeSource, targetTagId: mergeTarget }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Tags merged");
        setMergeOpen(false);
        setMergeSource("");
        setMergeTarget("");
        fetchTags();
      } else {
        toast.error(json.error ?? "Failed to merge tags");
      }
    } finally {
      setMerging(false);
    }
  }

  const columns: Column<TagRow>[] = [
    { key: "name", header: "Name", render: (row) => row.name },
    { key: "products", header: "Products", render: (row) => row._count.products },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(row)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800" aria-label={`Edit ${row.name}`}>
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setDeleteTarget(row)} className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950" aria-label={`Delete ${row.name}`}>
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
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Tags</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{tags.length} total tags</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setMergeOpen(true)}>
            <Merge className="h-4 w-4" /> Merge Tags
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Tag
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <DataTable columns={columns} data={tags} rowKey={(row) => row.id} loading={loading} emptyTitle="No tags yet" />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? "Edit Tag" : "Add Tag"}
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
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      </Modal>

      <Modal
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        title="Merge Tags"
        footer={
          <>
            <Button variant="outline" onClick={() => setMergeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMerge} loading={merging}>
              Merge
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Merge this tag..."
            value={mergeSource}
            onChange={(e) => setMergeSource(e.target.value)}
            placeholder="Select source tag"
            options={tags.map((t) => ({ label: t.name, value: t.id }))}
          />
          <Select
            label="...into this tag"
            value={mergeTarget}
            onChange={(e) => setMergeTarget(e.target.value)}
            placeholder="Select target tag"
            options={tags.filter((t) => t.id !== mergeSource).map((t) => ({ label: t.name, value: t.id }))}
          />
          <p className="text-xs text-gray-500 dark:text-neutral-400">
            All products tagged with the source tag will be re-tagged with the target tag, and the source tag
            will be deleted.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete tag"
        description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
