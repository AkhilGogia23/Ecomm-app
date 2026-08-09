"use client";

import { useEffect, useState } from "react";
import Tabs from "@/components/ui/Tabs";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { toast } from "@/store/toast";

type Values = Record<string, unknown>;

function useSettingsGroup(group: string) {
  const [values, setValues] = useState<Values>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/settings?group=${group}`);
        const json = await res.json();
        if (json.success) setValues(json.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [group]);

  function update(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group, values }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Settings saved");
      } else {
        toast.error(json.error ?? "Failed to save settings");
      }
    } finally {
      setSaving(false);
    }
  }

  return { values, update, save, loading, saving };
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: unknown; onChange: (v: string) => void; type?: string }) {
  return (
    <Input
      label={label}
      type={type}
      value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-neutral-300">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function GeneralTab() {
  const { values, update, save, loading, saving } = useSettingsGroup("GENERAL");
  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <Field label="Store Name" value={values.store_name} onChange={(v) => update("store_name", v)} />
      <Field label="Tagline" value={values.store_tagline} onChange={(v) => update("store_tagline", v)} />
      <Field label="Store Email" value={values.store_email} onChange={(v) => update("store_email", v)} />
      <Field label="Store Phone" value={values.store_phone} onChange={(v) => update("store_phone", v)} />
      <Field label="Currency Symbol" value={values.currency_symbol} onChange={(v) => update("currency_symbol", v)} />
      <Field label="Timezone" value={values.timezone} onChange={(v) => update("timezone", v)} />
      <Field label="Announcement Text" value={values.announcement_text} onChange={(v) => update("announcement_text", v)} />
      <Toggle label="Announcement Active" checked={!!values.announcement_active} onChange={(v) => update("announcement_active", v)} />
      <Button onClick={save} loading={saving}>Save</Button>
    </div>
  );
}

function SeoTab() {
  const { values, update, save, loading, saving } = useSettingsGroup("SEO");
  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <Field label="Meta Title Template" value={values.meta_title_template} onChange={(v) => update("meta_title_template", v)} />
      <Field label="Default Meta Description" value={values.default_meta_description} onChange={(v) => update("default_meta_description", v)} />
      <Field label="Google Analytics ID" value={values.google_analytics_id} onChange={(v) => update("google_analytics_id", v)} />
      <Button onClick={save} loading={saving}>Save</Button>
    </div>
  );
}

function ShippingTab() {
  const { values, update, save, loading, saving } = useSettingsGroup("SHIPPING");
  if (loading) return <Skeleton className="h-64 w-full" />;

  interface Rule { name: string; type: string; threshold: number | null; rate: number; active: boolean }
  const rules = Array.isArray(values.shipping_rules) ? (values.shipping_rules as Rule[]) : [];

  function updateRule(index: number, patch: Partial<Rule>) {
    const next = rules.map((r, i) => (i === index ? { ...r, ...patch } : r));
    update("shipping_rules", next);
  }

  function addRule() {
    update("shipping_rules", [...rules, { name: "New Rule", type: "FLAT", threshold: null, rate: 0, active: true }]);
  }

  function removeRule(index: number) {
    update("shipping_rules", rules.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      {rules.map((rule, i) => (
        <div key={i} className="grid grid-cols-5 items-end gap-2 rounded-md border border-gray-200 p-3 dark:border-neutral-800">
          <Input label="Name" value={rule.name} onChange={(e) => updateRule(i, { name: e.target.value })} />
          <Input label="Threshold" type="number" value={rule.threshold ?? ""} onChange={(e) => updateRule(i, { threshold: e.target.value ? Number(e.target.value) : null })} />
          <Input label="Rate (₹)" type="number" value={rule.rate} onChange={(e) => updateRule(i, { rate: Number(e.target.value) })} />
          <Toggle label="Active" checked={rule.active} onChange={(v) => updateRule(i, { active: v })} />
          <Button variant="destructive" size="sm" onClick={() => removeRule(i)}>Remove</Button>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={addRule}>Add Rule</Button>
      <div>
        <Button onClick={save} loading={saving}>Save</Button>
      </div>
    </div>
  );
}

function PaymentTab() {
  const { values, update, save, loading, saving } = useSettingsGroup("PAYMENT");
  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <Field label="Razorpay Key ID" value={values.razorpay_key_id} onChange={(v) => update("razorpay_key_id", v)} />
      <Field label="Razorpay Key Secret" type="password" value={values.razorpay_key_secret} onChange={(v) => update("razorpay_key_secret", v)} />
      <Toggle label="Cash on Delivery Enabled" checked={!!values.cod_enabled} onChange={(v) => update("cod_enabled", v)} />
      <Field label="COD Limit (₹)" type="number" value={values.cod_limit} onChange={(v) => update("cod_limit", Number(v))} />
      <Button onClick={save} loading={saving}>Save</Button>
    </div>
  );
}

function EmailTab() {
  const { values, update, save, loading, saving } = useSettingsGroup("EMAIL");
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  if (loading) return <Skeleton className="h-64 w-full" />;

  async function sendTest() {
    if (!testEmail) {
      toast.error("Enter a recipient email");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Test email sent");
      } else {
        toast.error(json.error ?? "Failed to send test email");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="SMTP Host" value={values.smtp_host} onChange={(v) => update("smtp_host", v)} />
      <Field label="SMTP Port" value={values.smtp_port} onChange={(v) => update("smtp_port", v)} />
      <Field label="SMTP User" value={values.smtp_user} onChange={(v) => update("smtp_user", v)} />
      <Field label="SMTP Password" type="password" value={values.smtp_pass} onChange={(v) => update("smtp_pass", v)} />
      <Field label="From Name" value={values.email_from_name} onChange={(v) => update("email_from_name", v)} />
      <Field label="From Address" value={values.email_from_address} onChange={(v) => update("email_from_address", v)} />
      <Button onClick={save} loading={saving}>Save</Button>
      <div className="flex items-end gap-2 border-t border-gray-200 pt-4 dark:border-neutral-800">
        <Input label="Send test email to" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="w-64" />
        <Button variant="outline" onClick={sendTest} loading={sending}>Send Test Email</Button>
      </div>
    </div>
  );
}

function TaxTab() {
  const { values, update, save, loading, saving } = useSettingsGroup("TAX");
  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <Field label="Default Tax Rate (%)" type="number" value={values.default_tax_rate} onChange={(v) => update("default_tax_rate", Number(v))} />
      <Field label="GSTIN" value={values.gstin} onChange={(v) => update("gstin", v)} />
      <Toggle label="Tax Included In Price" checked={!!values.tax_included_in_price} onChange={(v) => update("tax_included_in_price", v)} />
      <Button onClick={save} loading={saving}>Save</Button>
    </div>
  );
}

function SocialTab() {
  const { values, update, save, loading, saving } = useSettingsGroup("SOCIAL");
  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <Field label="Instagram" value={values.social_instagram} onChange={(v) => update("social_instagram", v)} />
      <Field label="Facebook" value={values.social_facebook} onChange={(v) => update("social_facebook", v)} />
      <Field label="Twitter" value={values.social_twitter} onChange={(v) => update("social_twitter", v)} />
      <Field label="YouTube" value={values.social_youtube} onChange={(v) => update("social_youtube", v)} />
      <Field label="WhatsApp" value={values.social_whatsapp} onChange={(v) => update("social_whatsapp", v)} />
      <Button onClick={save} loading={saving}>Save</Button>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-neutral-400">Configure your store</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <Tabs
          tabs={[
            { key: "general", label: "General", content: <GeneralTab /> },
            { key: "seo", label: "SEO", content: <SeoTab /> },
            { key: "shipping", label: "Shipping", content: <ShippingTab /> },
            { key: "payment", label: "Payment", content: <PaymentTab /> },
            { key: "email", label: "Email", content: <EmailTab /> },
            { key: "tax", label: "Tax", content: <TaxTab /> },
            { key: "social", label: "Social", content: <SocialTab /> },
          ]}
        />
      </div>
    </div>
  );
}
