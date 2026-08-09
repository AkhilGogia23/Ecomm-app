"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { toast } from "@/store/toast";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Message sent! We'll get back to you soon.");
        setForm({ name: "", email: "", phone: "", subject: "", message: "" });
      } else {
        toast.error(json.error ?? "Failed to send message");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">Contact Us</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-neutral-400">
        Have a question? Fill out the form below and our team will get back to you.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        <Input label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        <Input label="Subject" required value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">Message</label>
          <textarea
            required
            rows={5}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-white"
          />
        </div>
        <Button type="submit" loading={submitting} className="w-full">
          Send Message
        </Button>
      </form>
    </div>
  );
}
