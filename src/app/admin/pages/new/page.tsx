"use client";

import PageForm from "@/components/admin/pages/PageForm";

const EMPTY_VALUES = {
  title: "",
  slug: "",
  content: "",
  metaTitle: "",
  metaDescription: "",
  isPublished: false,
};

export default function NewPagePage() {
  return <PageForm initialValues={EMPTY_VALUES} />;
}
