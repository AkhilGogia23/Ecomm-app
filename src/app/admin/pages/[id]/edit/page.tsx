"use client";

import { useEffect, useState, use } from "react";
import PageForm, { type PageFormValues } from "@/components/admin/pages/PageForm";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

export default function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [values, setValues] = useState<PageFormValues | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/pages/${id}`);
        const json = await res.json();
        if (json.success) {
          setValues({
            id: json.data.id,
            title: json.data.title,
            slug: json.data.slug,
            content: json.data.content,
            metaTitle: json.data.metaTitle ?? "",
            metaDescription: json.data.metaDescription ?? "",
            isPublished: json.data.isPublished,
          });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!values) {
    return <EmptyState title="Page not found" />;
  }

  return <PageForm initialValues={values} />;
}
