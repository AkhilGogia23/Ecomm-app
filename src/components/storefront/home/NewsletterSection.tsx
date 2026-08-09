"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { toast } from "@/store/toast";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function subscribe() {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Thanks for subscribing!");
        setEmail("");
      } else {
        toast.error(json.error ?? "Failed to subscribe");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl bg-gray-900 px-8 py-12 text-center dark:bg-neutral-900">
      <h2 className="text-xl font-semibold text-white sm:text-2xl">Join our newsletter</h2>
      <p className="mt-1 text-sm text-gray-300">Get 10% off your first order and updates on new arrivals.</p>
      <div className="mx-auto mt-5 flex max-w-sm gap-2">
        <Input
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
        />
        <Button onClick={subscribe} loading={loading}>
          Subscribe
        </Button>
      </div>
    </section>
  );
}
