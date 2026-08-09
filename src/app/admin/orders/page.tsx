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
import Pagination from "@/components/ui/Pagination";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { formatPrice } from "@/lib/utils/price";
import { toast } from "@/store/toast";

interface OrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  itemCount: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
  DELIVERED: "success",
  SHIPPED: "info",
  PROCESSING: "info",
  CONFIRMED: "info",
  PENDING: "warning",
  CANCELLED: "error",
  RETURNED: "error",
  REFUNDED: "default",
};

const PAYMENT_VARIANT: Record<string, "success" | "warning" | "error" | "default"> = {
  PAID: "success",
  PENDING: "warning",
  FAILED: "error",
  REFUNDED: "default",
  PARTIALLY_REFUNDED: "default",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  const limit = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.set("status", status);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
      if (search) params.set("search", search);
      if (dateRange.startDate) params.set("startDate", dateRange.startDate);
      if (dateRange.endDate) params.set("endDate", dateRange.endDate);

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setOrders(json.data);
        setTotalPages(json.meta?.totalPages ?? 1);
        setTotal(json.meta?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, status, paymentStatus, search, dateRange]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on filter change
    fetchOrders();
  }, [fetchOrders]);

  async function handleExportCsv() {
    const res = await fetch(`/api/admin/orders?limit=1000`);
    const json = await res.json();
    if (!json.success) {
      toast.error("Failed to export orders");
      return;
    }
    const rows = (json.data as OrderRow[]).map((o) => ({
      order_number: o.orderNumber,
      customer: o.customerName,
      email: o.customerEmail,
      total: o.totalAmount,
      status: o.status,
      payment_status: o.paymentStatus,
      date: o.createdAt,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: Column<OrderRow>[] = [
    {
      key: "orderNumber",
      header: "Order",
      render: (row) => (
        <Link href={`/admin/orders/${row.id}`} className="font-medium text-gray-900 hover:underline dark:text-white">
          {row.orderNumber}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (row) => (
        <div>
          <p className="text-gray-900 dark:text-white">{row.customerName}</p>
          <p className="text-xs text-gray-500 dark:text-neutral-400">{row.customerEmail}</p>
        </div>
      ),
    },
    { key: "items", header: "Items", render: (row) => row.itemCount },
    { key: "total", header: "Total", render: (row) => formatPrice(row.totalAmount) },
    {
      key: "paymentStatus",
      header: "Payment",
      render: (row) => <Badge variant={PAYMENT_VARIANT[row.paymentStatus] ?? "default"}>{row.paymentStatus}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge variant={STATUS_VARIANT[row.status] ?? "default"}>{row.status}</Badge>,
    },
    { key: "date", header: "Date", render: (row) => new Date(row.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Orders</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{total} total orders</p>
        </div>
        <Button variant="outline" onClick={handleExportCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        <SearchInput value={search} onSearch={setSearch} placeholder="Search order # or customer..." className="w-64" />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="All statuses"
          options={[
            { label: "Pending", value: "PENDING" },
            { label: "Confirmed", value: "CONFIRMED" },
            { label: "Processing", value: "PROCESSING" },
            { label: "Shipped", value: "SHIPPED" },
            { label: "Delivered", value: "DELIVERED" },
            { label: "Cancelled", value: "CANCELLED" },
            { label: "Returned", value: "RETURNED" },
            { label: "Refunded", value: "REFUNDED" },
          ]}
          className="w-40"
        />
        <Select
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value)}
          placeholder="All payment status"
          options={[
            { label: "Pending", value: "PENDING" },
            { label: "Paid", value: "PAID" },
            { label: "Failed", value: "FAILED" },
            { label: "Refunded", value: "REFUNDED" },
          ]}
          className="w-40"
        />
        <DateRangePicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={setDateRange}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <DataTable columns={columns} data={orders} rowKey={(row) => row.id} loading={loading} emptyTitle="No orders found" />
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
      </div>
    </div>
  );
}
