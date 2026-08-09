"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import FileUpload from "@/components/ui/FileUpload";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { toast } from "@/store/toast";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imagePath: string;
  mobileImagePath: string | null;
  link: string | null;
  position: string;
  isActive: boolean;
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
}

interface FormState {
  id?: string;
  title: string;
  subtitle: string;
  imagePath: string;
  mobileImagePath: string;
  link: string;
  position: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  subtitle: "",
  imagePath: "",
  mobileImagePath: "",
  link: "",
  position: "HERO",
  isActive: true,
  startDate: "",
  endDate: "",
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/banners");
      const json = await res.json();
      if (json.success) setBanners(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    fetchBanners();
  }, [fetchBanners]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(banner: Banner) {
    setForm({
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle ?? "",
      imagePath: banner.imagePath,
      mobileImagePath: banner.mobileImagePath ?? "",
      link: banner.link ?? "",
      position: banner.position,
      isActive: banner.isActive,
      startDate: banner.startDate ? banner.startDate.slice(0, 10) : "",
      endDate: banner.endDate ? banner.endDate.slice(0, 10) : "",
    });
    setModalOpen(true);
  }

  async function handleUpload(files: File[], field: "imagePath" | "mobileImagePath") {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "banners");
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        setForm((prev) => ({ ...prev, [field]: json.data.path }));
      } else {
        toast.error(json.error ?? "Failed to upload image");
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.title.trim() || !form.imagePath) {
      toast.error("Title and desktop image are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle || undefined,
        imagePath: form.imagePath,
        mobileImagePath: form.mobileImagePath || undefined,
        link: form.link || undefined,
        position: form.position,
        isActive: form.isActive,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      };

      const url = form.id ? `/api/admin/banners/${form.id}` : "/api/admin/banners";
      const method = form.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(form.id ? "Banner updated" : "Banner created");
        setModalOpen(false);
        fetchBanners();
      } else {
        toast.error(json.error ?? "Failed to save banner");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/banners/${deleteTarget.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Banner deleted");
      setDeleteTarget(null);
      fetchBanners();
    } else {
      toast.error(json.error ?? "Failed to delete banner");
    }
  }

  async function toggleActive(banner: Banner) {
    await fetch(`/api/admin/banners/${banner.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !banner.isActive }),
    });
    fetchBanners();
  }

  async function move(banner: Banner, direction: "up" | "down") {
    const siblings = banners.filter((b) => b.position === banner.position).sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex((b) => b.id === banner.id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;

    const other = siblings[swapIndex];
    await Promise.all([
      fetch(`/api/admin/banners/${banner.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: other.sortOrder }),
      }),
      fetch(`/api/admin/banners/${other.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: banner.sortOrder }),
      }),
    ]);
    fetchBanners();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Banners</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{banners.length} total banners</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Banner
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : banners.length === 0 ? (
          <EmptyState title="No banners yet" description="Add a hero banner to feature on your homepage." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 dark:border-neutral-800 dark:text-neutral-400">
                <th className="px-5 py-2 font-medium">Preview</th>
                <th className="px-5 py-2 font-medium">Title</th>
                <th className="px-5 py-2 font-medium">Position</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium">Order</th>
                <th className="px-5 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((b) => (
                <tr key={b.id} className="border-b border-gray-50 last:border-0 dark:border-neutral-800/50">
                  <td className="px-5 py-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.imagePath} alt={b.title} className="h-10 w-20 rounded object-cover" />
                  </td>
                  <td className="px-5 py-2.5 font-medium text-gray-900 dark:text-white">{b.title}</td>
                  <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{b.position}</td>
                  <td className="px-5 py-2.5">
                    <button onClick={() => toggleActive(b)}>
                      <Badge variant={b.isActive ? "success" : "default"}>{b.isActive ? "Active" : "Inactive"}</Badge>
                    </button>
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => move(b, "up")} className="text-gray-400 hover:text-gray-700" aria-label="Move up">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => move(b, "down")} className="text-gray-400 hover:text-gray-700" aria-label="Move down">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(b)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800" aria-label={`Edit ${b.title}`}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(b)} className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950" aria-label={`Delete ${b.title}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? "Edit Banner" : "Add Banner"}
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
          <Input label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <Input label="Subtitle" value={form.subtitle} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} />
          <Input label="Link URL" value={form.link} onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))} />
          <Select
            label="Position"
            value={form.position}
            onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
            options={[
              { label: "Hero", value: "HERO" },
              { label: "Secondary", value: "SECONDARY" },
              { label: "Sidebar", value: "SIDEBAR" },
              { label: "Popup", value: "POPUP" },
            ]}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">Desktop Image</label>
            {form.imagePath && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.imagePath} alt="" className="mb-2 h-16 w-32 rounded object-cover" />
            )}
            <FileUpload onFilesAccepted={(f) => handleUpload(f, "imagePath")} multiple={false} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">Mobile Image (optional)</label>
            {form.mobileImagePath && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.mobileImagePath} alt="" className="mb-2 h-16 w-32 rounded object-cover" />
            )}
            <FileUpload onFilesAccepted={(f) => handleUpload(f, "mobileImagePath")} multiple={false} />
          </div>
          {uploading && <p className="text-xs text-gray-500">Uploading...</p>}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
            <Input label="End Date" type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-neutral-300">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
            Active
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete banner"
        description={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
