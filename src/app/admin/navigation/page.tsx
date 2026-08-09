"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import Tabs from "@/components/ui/Tabs";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { toast } from "@/store/toast";

interface NavItem {
  id: string;
  label: string;
  url: string;
  parentId: string | null;
  position: string;
  sortOrder: number;
  isActive: boolean;
}

interface FormState {
  id?: string;
  label: string;
  url: string;
  parentId: string;
  position: string;
  isActive: boolean;
}

function emptyForm(position: string): FormState {
  return { label: "", url: "", parentId: "", position, isActive: true };
}

function NavList({ position }: { position: "HEADER" | "FOOTER" }) {
  const [items, setItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(position));
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NavItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/navigation?position=${position}`);
      const json = await res.json();
      if (json.success) setItems(json.data);
    } finally {
      setLoading(false);
    }
  }, [position]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    fetchItems();
  }, [fetchItems]);

  function openCreate() {
    setForm(emptyForm(position));
    setModalOpen(true);
  }

  function openEdit(item: NavItem) {
    setForm({ id: item.id, label: item.label, url: item.url, parentId: item.parentId ?? "", position, isActive: item.isActive });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.label.trim() || !form.url.trim()) {
      toast.error("Label and URL are required");
      return;
    }
    setSaving(true);
    try {
      const payload = { label: form.label, url: form.url, parentId: form.parentId || undefined, position: form.position, isActive: form.isActive };
      const url = form.id ? `/api/admin/navigation/${form.id}` : "/api/admin/navigation";
      const method = form.id ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.success) {
        toast.success(form.id ? "Menu item updated" : "Menu item created");
        setModalOpen(false);
        fetchItems();
      } else {
        toast.error(json.error ?? "Failed to save menu item");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/navigation/${deleteTarget.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Menu item deleted");
      setDeleteTarget(null);
      fetchItems();
    } else {
      toast.error(json.error ?? "Failed to delete menu item");
    }
  }

  async function move(item: NavItem, direction: "up" | "down") {
    const siblings = items.filter((i) => i.parentId === item.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex((i) => i.id === item.id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;

    const other = siblings[swapIndex];
    await Promise.all([
      fetch(`/api/admin/navigation/${item.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: other.sortOrder }) }),
      fetch(`/api/admin/navigation/${other.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: item.sortOrder }) }),
    ]);
    fetchItems();
  }

  const parentOptions = items.filter((i) => i.id !== form.id).map((i) => ({ label: i.label, value: i.id }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Menu Item
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="No menu items yet" />
        ) : (
          items
            .filter((i) => !i.parentId)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => (
              <div key={item.id}>
                <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 last:border-0 dark:border-neutral-800/50">
                  <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{item.label}</span>
                  <span className="text-xs text-gray-400">{item.url}</span>
                  <button onClick={() => move(item, "up")} className="p-1 text-gray-400 hover:text-gray-700" aria-label="Move up">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => move(item, "down")} className="p-1 text-gray-400 hover:text-gray-700" aria-label="Move down">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => openEdit(item)} className="p-1 text-gray-400 hover:text-gray-700" aria-label={`Edit ${item.label}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(item)} className="p-1 text-red-400 hover:text-red-600" aria-label={`Delete ${item.label}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {items
                  .filter((child) => child.parentId === item.id)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((child) => (
                    <div key={child.id} className="flex items-center gap-2 border-b border-gray-100 py-2.5 pl-10 pr-4 last:border-0 dark:border-neutral-800/50">
                      <span className="flex-1 text-sm text-gray-700 dark:text-neutral-300">{child.label}</span>
                      <span className="text-xs text-gray-400">{child.url}</span>
                      <button onClick={() => openEdit(child)} className="p-1 text-gray-400 hover:text-gray-700" aria-label={`Edit ${child.label}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(child)} className="p-1 text-red-400 hover:text-red-600" aria-label={`Delete ${child.label}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            ))
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? "Edit Menu Item" : "Add Menu Item"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Label" value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} />
          <Input label="URL" value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} />
          <Select
            label="Parent"
            value={form.parentId}
            onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value }))}
            placeholder="None (top-level)"
            options={parentOptions}
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-neutral-300">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
            Active
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete menu item"
        description={`Are you sure you want to delete "${deleteTarget?.label}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default function AdminNavigationPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Navigation</h1>
        <p className="text-sm text-gray-500 dark:text-neutral-400">Manage header and footer menu links</p>
      </div>

      <Tabs
        tabs={[
          { key: "header", label: "Header Menu", content: <NavList position="HEADER" /> },
          { key: "footer", label: "Footer Menu", content: <NavList position="FOOTER" /> },
        ]}
      />
    </div>
  );
}
