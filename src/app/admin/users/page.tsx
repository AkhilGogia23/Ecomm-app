"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { toast } from "@/store/toast";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
}

interface FormState {
  name: string;
  email: string;
  password: string;
  role: string;
}

const EMPTY_FORM: FormState = { name: "", email: "", password: "", role: "STAFF" };

const PERMISSION_MATRIX: { role: string; modules: string }[] = [
  { role: "SUPER_ADMIN", modules: "All modules" },
  { role: "ADMIN", modules: "Products, Orders, Customers, Inventory, Coupons, Content, Reviews, Analytics, Settings, Audit" },
  { role: "MANAGER", modules: "Products, Orders, Customers, Inventory, Coupons, Content, Reviews, Analytics" },
  { role: "STAFF", modules: "Products (read), Orders (update status), Inventory, Reviews" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (json.success) setUsers(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    fetchUsers();
  }, [fetchUsers]);

  async function handleCreate() {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error("Name, email, and password are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Admin user created");
        setModalOpen(false);
        setForm(EMPTY_FORM);
        fetchUsers();
      } else {
        toast.error(json.error ?? "Failed to create user");
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateRole(user: AdminUser, role: string) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Role updated");
      fetchUsers();
    } else {
      toast.error(json.error ?? "Failed to update role");
    }
  }

  async function toggleActive(user: AdminUser) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success(user.isActive ? "User deactivated" : "User activated");
      fetchUsers();
    }
  }

  const columns: Column<AdminUser>[] = [
    { key: "name", header: "Name", render: (row) => row.name },
    { key: "email", header: "Email", render: (row) => row.email },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <Select
          value={row.role}
          onChange={(e) => updateRole(row, e.target.value)}
          options={[
            { label: "Super Admin", value: "SUPER_ADMIN" },
            { label: "Admin", value: "ADMIN" },
            { label: "Manager", value: "MANAGER" },
            { label: "Staff", value: "STAFF" },
          ]}
          className="w-40"
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <button onClick={() => toggleActive(row)}>
          <Badge variant={row.isActive ? "success" : "default"}>{row.isActive ? "Active" : "Inactive"}</Badge>
        </button>
      ),
    },
    {
      key: "lastLogin",
      header: "Last Login",
      render: (row) => (row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : "Never"),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Users & Roles</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{users.length} admin users</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <DataTable columns={columns} data={users} rowKey={(row) => row.id} loading={loading} emptyTitle="No admin users found" />
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-medium text-gray-900 dark:text-white">Permission Matrix</h2>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 dark:border-neutral-800 dark:text-neutral-400">
                <th className="px-5 py-2 font-medium">Role</th>
                <th className="px-5 py-2 font-medium">Modules</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX.map((p) => (
                <tr key={p.role} className="border-b border-gray-50 last:border-0 dark:border-neutral-800/50">
                  <td className="px-5 py-2.5 font-medium text-gray-900 dark:text-white">{p.role}</td>
                  <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{p.modules}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Admin User"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <Input
            label="Temporary Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            helperText="Min 8 characters, with uppercase, lowercase, and a number"
          />
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
            options={[
              { label: "Super Admin", value: "SUPER_ADMIN" },
              { label: "Admin", value: "ADMIN" },
              { label: "Manager", value: "MANAGER" },
              { label: "Staff", value: "STAFF" },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
}
