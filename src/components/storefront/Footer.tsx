"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Image as ImageIcon, Users, MessageCircle, Video } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { toast } from "@/store/toast";

interface NavItem {
  id: string;
  label: string;
  url: string;
}

interface PublicSettings {
  store_name?: string;
  store_tagline?: string;
  store_email?: string;
  store_phone?: string;
  social_instagram?: string;
  social_facebook?: string;
  social_twitter?: string;
  social_youtube?: string;
}

export default function Footer() {
  const [footerItems, setFooterItems] = useState<NavItem[]>([]);
  const [settings, setSettings] = useState<PublicSettings>({});
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string; parentId: string | null }[]>([]);
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    fetch("/api/navigation?position=FOOTER")
      .then((r) => r.json())
      .then((json) => json.success && setFooterItems(json.data));
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((json) => json.success && setSettings(json.data));
    fetch("/api/categories")
      .then((r) => r.json())
      .then((json) => json.success && setCategories(json.data));
  }, []);

  async function subscribe() {
    if (!email) return;
    setSubscribing(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Subscribed to newsletter");
        setEmail("");
      } else {
        toast.error(json.error ?? "Failed to subscribe");
      }
    } finally {
      setSubscribing(false);
    }
  }

  const topCategories = categories.filter((c) => !c.parentId).slice(0, 5);

  return (
    <footer className="border-t border-gray-200 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{settings.store_name ?? "About"}</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">{settings.store_tagline}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Quick Links</h3>
            <ul className="mt-2 space-y-1.5">
              {footerItems.map((item) => (
                <li key={item.id}>
                  <Link href={item.url} className="text-sm text-gray-500 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Categories</h3>
            <ul className="mt-2 space-y-1.5">
              {topCategories.map((c) => (
                <li key={c.id}>
                  <Link href={`/category/${c.slug}`} className="text-sm text-gray-500 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Contact</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">{settings.store_email}</p>
            <p className="text-sm text-gray-500 dark:text-neutral-400">{settings.store_phone}</p>
            <div className="mt-3 flex gap-3 text-gray-400">
              {settings.social_instagram && (
                <a href={settings.social_instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <ImageIcon className="h-4 w-4 hover:text-gray-700 dark:hover:text-neutral-200" />
                </a>
              )}
              {settings.social_facebook && (
                <a href={settings.social_facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <Users className="h-4 w-4 hover:text-gray-700 dark:hover:text-neutral-200" />
                </a>
              )}
              {settings.social_twitter && (
                <a href={settings.social_twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                  <MessageCircle className="h-4 w-4 hover:text-gray-700 dark:hover:text-neutral-200" />
                </a>
              )}
              {settings.social_youtube && (
                <a href={settings.social_youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                  <Video className="h-4 w-4 hover:text-gray-700 dark:hover:text-neutral-200" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-200 pt-6 dark:border-neutral-800">
          <p className="mb-2 text-sm font-medium text-gray-900 dark:text-white">Subscribe to our newsletter</p>
          <div className="flex max-w-sm gap-2">
            <Input placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" />
            <Button onClick={subscribe} loading={subscribing}>
              Subscribe
            </Button>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-gray-200 pt-6 text-xs text-gray-400 dark:border-neutral-800 sm:flex-row">
          <p>© {new Date().getFullYear()} {settings.store_name ?? "My Clothing Store"}. All rights reserved.</p>
          <p>Visa · Mastercard · UPI · Cash on Delivery</p>
        </div>
      </div>
    </footer>
  );
}
