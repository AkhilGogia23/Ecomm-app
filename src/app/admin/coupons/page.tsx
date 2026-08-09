"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, BarChart3, Dices } from "lucide-react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatPrice } from "@/lib/utils/price";
import { toast } from "@/store/toast";

interface CouponRow {
  id: string;
  code: string;
  type: string;
  value: number;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  _count: { usages: number };
}

interface FormState {
  id?: string;
  code: string;
  description: string;
  type: string;
  value: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  usageLimit: string;
  perUserLimit: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  code: "",
  description: "",
  type: "PERCENTAGE",
  value: "",
  minOrderAmount: "",
  maxDiscountAmount: "",
  usageLimit: "",
  perUserLimit: "1",
  startDate: "",
  endDate: "",
  isActive: true,
};

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

interface UsageData {
  timesUsed: number;
  totalDiscountGiven: number;
  revenueFromCouponOrders: number;
  usages: { id: string; userName: string; orderNumber: string; discountApplied: number; createdAt: string }[];
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CouponRow | null>(null);
  const [usageTarget, setUsageTarget] = useState<CouponRow | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      const json = await res.json();
      if (json.success) setCoupons(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    fetchCoupons();
  }, [fetchCoupons]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(coupon: CouponRow) {
    setForm({
      id: coupon.id,
      code: coupon.code,
      description: "",
      type: coupon.type,
      value: String(coupon.value),
      minOrderAmount: "",
      maxDiscountAmount: "",
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : "",
      perUserLimit: "1",
      startDate: coupon.startDate ? coupon.startDate.slice(0, 10) : "",
      endDate: coupon.endDate ? coupon.endDate.slice(0, 10) : "",
      isActive: coupon.isActive,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.code.trim() || !form.value) {
      toast.error("Code and value are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code,
        description: form.description || undefined,
        type: form.type,
        value: Number(form.value),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        perUserLimit: Number(form.perUserLimit || "1"),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        isActive: form.isActive,
      };

      const url = form.id ? `/api/admin/coupons/${form.id}` : "/api/admin/coupons";
      const method = form.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(form.id ? "Coupon updated" : "Coupon created");
        setModalOpen(false);
        fetchCoupons();
      } else {
        toast.error(json.error ?? "Failed to save coupon");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/coupons/${deleteTarget.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Coupon deleted");
      setDeleteTarget(null);
      fetchCoupons();
    } else {
      toast.error(json.error ?? "Failed to delete coupon");
    }
  }

  async function openUsage(coupon: CouponRow) {
    setUsageTarget(coupon);
    const res = await fetch(`/api/admin/coupons/${coupon.id}/usage`);
    const json = await res.json();
    if (json.success) setUsageData(json.data);
  }

  const columns: Column<CouponRow>[] = [
    { key: "code", header: "Code", render: (row) => <span className="font-mono font-medium">{row.code}</span> },
    { key: "type", header: "Type", render: (row) => row.type },
    {
      key: "value",
      header: "Value",
      render: (row) => (row.type === "PERCENTAGE" ? `${row.value}%` : formatPrice(row.value)),
    },
    { key: "usage", header: "Usage", render: (row) => `${row.usedCount}${row.usageLimit ? ` / ${row.usageLimit}` : ""}` },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge variant={row.isActive ? "success" : "default"}>{row.isActive ? "Active" : "Inactive"}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openUsage(row)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800" aria-label={`Usage for ${row.code}`}>
            <BarChart3 className="h-4 w-4" />
          </button>
          <button onClick={() => openEdit(row)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800" aria-label={`Edit ${row.code}`}>
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setDeleteTarget(row)} className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950" aria-label={`Delete ${row.code}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Coupons</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{coupons.length} total coupons</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Coupon
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <DataTable columns={columns} data={coupons} rowKey={(row) => row.id} loading={loading} emptyTitle="No coupons yet" />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? "Edit Coupon" : "Add Coupon"}
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
          <div className="flex items-end gap-2">
            <Input
              label="Code"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              disabled={!!form.id}
              className="flex-1"
            />
            {!form.id && (
              <Button type="button" variant="secondary" onClick={() => setForm((p) => ({ ...p, code: generateCode() }))}>
                <Dices className="h-4 w-4" /> Generate
              </Button>
            )}
          </div>
          <Input label="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              options={[
                { label: "Percentage", value: "PERCENTAGE" },
                { label: "Fixed Amount", value: "FIXED" },
                { label: "Free Shipping", value: "FREE_SHIPPING" },
              ]}
            />
            <Input label="Value" type="number" value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Min Order Amount" type="number" value={form.minOrderAmount} onChange={(e) => setForm((p) => ({ ...p, minOrderAmount: e.target.value }))} />
            <Input label="Max Discount Amount" type="number" value={form.maxDiscountAmount} onChange={(e) => setForm((p) => ({ ...p, maxDiscountAmount: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Usage Limit" type="number" value={form.usageLimit} onChange={(e) => setForm((p) => ({ ...p, usageLimit: e.target.value }))} />
            <Input label="Per-User Limit" type="number" value={form.perUserLimit} onChange={(e) => setForm((p) => ({ ...p, perUserLimit: e.target.value }))} />
          </div>
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

      <Modal open={!!usageTarget} onClose={() => setUsageTarget(null)} title={`Usage: ${usageTarget?.code}`} size="lg">
        {usageData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{usageData.timesUsed}</p>
                <p className="text-xs text-gray-500">Times Used</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatPrice(usageData.totalDiscountGiven)}</p>
                <p className="text-xs text-gray-500">Discount Given</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatPrice(usageData.revenueFromCouponOrders)}</p>
                <p className="text-xs text-gray-500">Revenue</p>
              </div>
            </div>
            {usageData.usages.length === 0 ? (
              <p className="text-center text-sm text-gray-400">No usage yet</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 dark:border-neutral-800">
                    <th className="py-2 font-medium">Customer</th>
                    <th className="py-2 font-medium">Order</th>
                    <th className="py-2 font-medium">Discount</th>
                  </tr>
                </thead>
                <tbody>
                  {usageData.usages.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 last:border-0 dark:border-neutral-800/50">
                      <td className="py-2">{u.userName}</td>
                      <td className="py-2">{u.orderNumber}</td>
                      <td className="py-2">{formatPrice(u.discountApplied)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Loading...</p>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete coupon"
        description={`Are you sure you want to delete "${deleteTarget?.code}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
