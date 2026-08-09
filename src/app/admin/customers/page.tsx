"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { Download } from "lucide-react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Select from "@/components/ui/Select";
import SearchInput from "@/components/ui/SearchInput";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils/price";
import { toast } from "@/store/toast";

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  ordersCount: number;
  totalSpent: number;
  joinedAt: string;
  segment: string;
}

const SEGMENT_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
  VIP: "success",
  REGULAR: "info",
  NEW: "warning",
  INACTIVE: "error",
  STANDARD: "default",
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("");
  const [total, setTotal] = useState(0);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (search) params.set("search", search);
      if (segment) params.set("segment", segment);
      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data);
        setTotal(json.meta?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [search, segment]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on filter change
    fetchCustomers();
  }, [fetchCustomers]);

  async function handleExportCsv() {
    const csv = Papa.unparse(
      customers.map((c) => ({
        name: c.name,
        email: c.email,
        phone: c.phone ?? "",
        orders: c.ordersCount,
        total_spent: c.totalSpent,
        segment: c.segment,
        joined: c.joinedAt,
      }))
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded");
  }

  const columns: Column<CustomerRow>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <Link href={`/admin/customers/${row.id}`} className="font-medium text-gray-900 hover:underline dark:text-white">
          {row.name}
        </Link>
      ),
    },
    { key: "email", header: "Email", render: (row) => row.email },
    { key: "phone", header: "Phone", render: (row) => row.phone ?? "—" },
    { key: "orders", header: "Orders", render: (row) => row.ordersCount },
    { key: "spent", header: "Total Spent", render: (row) => formatPrice(row.totalSpent) },
    { key: "joined", header: "Joined", render: (row) => new Date(row.joinedAt).toLocaleDateString() },
    {
      key: "segment",
      header: "Segment",
      render: (row) => <Badge variant={SEGMENT_VARIANT[row.segment] ?? "default"}>{row.segment}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{total} total customers</p>
        </div>
        <Button variant="outline" onClick={handleExportCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        <SearchInput value={search} onSearch={setSearch} placeholder="Search by name, email, or phone..." className="w-72" />
        <Select
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          placeholder="All segments"
          options={[
            { label: "VIP", value: "VIP" },
            { label: "Regular", value: "REGULAR" },
            { label: "New", value: "NEW" },
            { label: "Inactive", value: "INACTIVE" },
          ]}
          className="w-40"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <DataTable columns={columns} data={customers} rowKey={(row) => row.id} loading={loading} emptyTitle="No customers found" />
      </div>
    </div>
  );
}
