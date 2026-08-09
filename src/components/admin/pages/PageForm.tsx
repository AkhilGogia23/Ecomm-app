"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { generateSlug } from "@/lib/utils/slug";
import { toast } from "@/store/toast";

export interface PageFormValues {
  id?: string;
  title: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  isPublished: boolean;
}

export default function PageForm({ initialValues }: { initialValues: PageFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<PageFormValues>(initialValues);
  const [saving, setSaving] = useState(false);
  const mode = initialValues.id ? "edit" : "create";

  function update<K extends keyof PageFormValues>(key: K, value: PageFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!values.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: values.title,
        slug: values.slug || generateSlug(values.title),
        content: values.content,
        metaTitle: values.metaTitle || undefined,
        metaDescription: values.metaDescription || undefined,
        isPublished: values.isPublished,
      };

      const url = mode === "create" ? "/api/admin/pages" : `/api/admin/pages/${values.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(mode === "create" ? "Page created" : "Page updated");
        router.push("/admin/pages");
      } else {
        toast.error(json.error ?? "Failed to save page");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {mode === "create" ? "Add Page" : "Edit Page"}
        </h1>
        <Button onClick={handleSave} loading={saving}>
          Save
        </Button>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <Input label="Title" value={values.title} onChange={(e) => update("title", e.target.value)} />
        <Input
          label="Slug"
          value={values.slug}
          onChange={(e) => update("slug", e.target.value)}
          helperText={`/${values.slug || generateSlug(values.title)}`}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">Content</label>
          <RichTextEditor value={values.content} onChange={(html) => update("content", html)} />
        </div>
        <Input label="Meta Title" value={values.metaTitle} onChange={(e) => update("metaTitle", e.target.value)} />
        <Input label="Meta Description" value={values.metaDescription} onChange={(e) => update("metaDescription", e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-neutral-300">
          <input type="checkbox" checked={values.isPublished} onChange={(e) => update("isPublished", e.target.checked)} />
          Published
        </label>
      </div>
    </div>
  );
}
