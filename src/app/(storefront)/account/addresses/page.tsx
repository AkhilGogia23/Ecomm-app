"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Star } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { toast } from "@/store/toast";

interface Address {
  id: string;
  label: string;
  firstName: string;
  lastName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

const EMPTY_FORM = {
  label: "HOME",
  firstName: "",
  lastName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  isDefault: false,
};

export default function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/addresses");
      const json = await res.json();
      if (json.success) setAddresses(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    fetchAddresses();
  }, [fetchAddresses]);

  async function handleSave() {
    if (!form.firstName || !form.line1 || !form.city || !form.postalCode) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Address added");
        setModalOpen(false);
        setForm(EMPTY_FORM);
        fetchAddresses();
      } else {
        toast.error(json.error ?? "Failed to add address");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Address deleted");
      fetchAddresses();
    } else {
      toast.error(json.error ?? "Failed to delete address");
    }
  }

  async function setDefault(id: string) {
    const res = await fetch(`/api/addresses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Default address updated");
      fetchAddresses();
    }
  }

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">My Addresses</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Add New Address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <EmptyState title="No saved addresses" description="Add an address to speed up checkout." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <Card key={a.id}>
              <CardBody className="space-y-1 text-sm">
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant="default">{a.label}</Badge>
                  {a.isDefault && <Badge variant="success">Default</Badge>}
                </div>
                <p className="font-medium text-gray-900 dark:text-white">{a.firstName} {a.lastName}</p>
                <p className="text-gray-600 dark:text-neutral-300">{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
                <p className="text-gray-600 dark:text-neutral-300">{a.city}, {a.state} {a.postalCode}</p>
                <p className="text-gray-600 dark:text-neutral-300">{a.phone}</p>
                <div className="mt-2 flex gap-3">
                  {!a.isDefault && (
                    <button onClick={() => setDefault(a.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:underline">
                      <Star className="h-3 w-3" /> Set as default
                    </button>
                  )}
                  <button onClick={() => handleDelete(a.id)} className="flex items-center gap-1 text-xs text-red-500 hover:underline">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Address"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Label"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            options={[
              { label: "Home", value: "HOME" },
              { label: "Work", value: "WORK" },
              { label: "Other", value: "OTHER" },
            ]}
            className="col-span-2"
          />
          <Input label="First Name" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
          <Input label="Last Name" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
          <Input label="Phone" className="col-span-2" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <Input label="Address Line 1" className="col-span-2" value={form.line1} onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))} />
          <Input label="Address Line 2" className="col-span-2" value={form.line2} onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))} />
          <Input label="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          <Input label="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
          <Input label="Pincode" value={form.postalCode} onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))} />
          <Input label="Country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
          <label className="col-span-2 flex items-center gap-2 text-sm text-gray-700 dark:text-neutral-300">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
            Set as default address
          </label>
        </div>
      </Modal>
    </div>
  );
}
