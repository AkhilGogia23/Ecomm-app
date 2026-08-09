"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, ArrowUp, ArrowDown, FolderTree } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import FileUpload from "@/components/ui/FileUpload";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { toast } from "@/store/toast";
import { cn } from "@/lib/cn";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imagePath: string | null;
  parentId: string | null;
  level: number;
  sortOrder: number;
  isActive: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  _count?: { products: number };
}

interface CategoryNode extends Category {
  children: CategoryNode[];
}

function buildTree(categories: Category[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  categories.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: CategoryNode[] = [];

  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}

interface FormState {
  id?: string;
  name: string;
  description: string;
  parentId: string;
  isActive: boolean;
  metaTitle: string;
  metaDescription: string;
  imagePath: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  parentId: "",
  isActive: true,
  metaTitle: "",
  metaDescription: "",
  imagePath: "",
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      const json = await res.json();
      if (json.success) setCategories(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    fetchCategories();
  }, [fetchCategories]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate(parentId?: string) {
    setForm({ ...EMPTY_FORM, parentId: parentId ?? "" });
    setModalOpen(true);
  }

  function openEdit(category: Category) {
    setForm({
      id: category.id,
      name: category.name,
      description: category.description ?? "",
      parentId: category.parentId ?? "",
      isActive: category.isActive,
      metaTitle: category.metaTitle ?? "",
      metaDescription: category.metaDescription ?? "",
      imagePath: category.imagePath ?? "",
    });
    setModalOpen(true);
  }

  async function handleImageUpload(files: File[]) {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "categories");
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
        parentId: form.parentId || undefined,
        isActive: form.isActive,
        metaTitle: form.metaTitle || undefined,
        metaDescription: form.metaDescription || undefined,
        imagePath: form.imagePath || undefined,
      };

      const url = form.id ? `/api/admin/categories/${form.id}` : "/api/admin/categories";
      const method = form.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(form.id ? "Category updated" : "Category created");
        setModalOpen(false);
        fetchCategories();
      } else {
        toast.error(json.error ?? "Failed to save category");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/categories/${deleteTarget.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Category deleted");
      setDeleteTarget(null);
      fetchCategories();
    } else {
      toast.error(json.error ?? "Failed to delete category");
    }
  }

  async function toggleActive(category: Category) {
    const res = await fetch(`/api/admin/categories/${category.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !category.isActive }),
    });
    const json = await res.json();
    if (json.success) {
      fetchCategories();
    }
  }

  async function move(category: Category, direction: "up" | "down") {
    const siblings = categories
      .filter((c) => c.parentId === category.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex((c) => c.id === category.id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;

    const other = siblings[swapIndex];
    await Promise.all([
      fetch(`/api/admin/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: other.sortOrder }),
      }),
      fetch(`/api/admin/categories/${other.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: category.sortOrder }),
      }),
    ]);
    fetchCategories();
  }

  const tree = buildTree(categories);
  const parentOptions = categories
    .filter((c) => c.id !== form.id)
    .map((c) => ({ label: `${"— ".repeat(c.level)}${c.name}`, value: c.id }));

  function renderNode(node: CategoryNode) {
    const isExpanded = expanded.has(node.id);
    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 last:border-0 dark:border-neutral-800/50"
          style={{ paddingLeft: `${12 + node.level * 24}px` }}
        >
          {node.children.length > 0 ? (
            <button onClick={() => toggleExpand(node.id)} className="text-gray-400">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-4" />
          )}
          {node.imagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={node.imagePath} alt={node.name} className="h-6 w-6 rounded object-cover" />
          ) : (
            <FolderTree className="h-4 w-4 text-gray-400" />
          )}
          <span className={cn("flex-1 text-sm", !node.isActive && "text-gray-400 line-through")}>
            {node.name}
          </span>
          <span className="text-xs text-gray-400">{node._count?.products ?? 0} products</span>
          <button onClick={() => toggleActive(node)} className="text-xs text-gray-500 hover:underline">
            {node.isActive ? "Active" : "Inactive"}
          </button>
          <button onClick={() => move(node, "up")} className="p-1 text-gray-400 hover:text-gray-700" aria-label="Move up">
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => move(node, "down")} className="p-1 text-gray-400 hover:text-gray-700" aria-label="Move down">
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => openCreate(node.id)} className="p-1 text-gray-400 hover:text-gray-700" aria-label="Add subcategory">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => openEdit(node)} className="p-1 text-gray-400 hover:text-gray-700" aria-label={`Edit ${node.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setDeleteTarget(node)} className="p-1 text-red-400 hover:text-red-600" aria-label={`Delete ${node.name}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {isExpanded && node.children.map((child) => renderNode(child))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Categories</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{categories.length} total categories</p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : tree.length === 0 ? (
          <EmptyState title="No categories yet" description="Create your first category to organize products." />
        ) : (
          tree.map((node) => renderNode(node))
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? "Edit Category" : "Add Category"}
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
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <Select
            label="Parent Category"
            value={form.parentId}
            onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value }))}
            placeholder="None (top-level)"
            options={parentOptions}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">Image</label>
            {form.imagePath && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.imagePath} alt="" className="mb-2 h-16 w-16 rounded object-cover" />
            )}
            <FileUpload onFilesAccepted={handleImageUpload} multiple={false} />
            {uploading && <p className="mt-1 text-xs text-gray-500">Uploading...</p>}
          </div>
          <Input
            label="Meta Title"
            value={form.metaTitle}
            onChange={(e) => setForm((p) => ({ ...p, metaTitle: e.target.value }))}
          />
          <Input
            label="Meta Description"
            value={form.metaDescription}
            onChange={(e) => setForm((p) => ({ ...p, metaDescription: e.target.value }))}
          />
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
        title="Delete category"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? Categories with products or subcategories cannot be deleted.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
