"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { IndianRupee, ShoppingBag, Users, AlertTriangle } from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import Badge from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils/price";
import { cn } from "@/lib/cn";

interface DashboardData {
  stats: {
    todayRevenue: number;
    todayOrders: number;
    newCustomers: number;
    lowStockCount: number;
  };
  revenueSeries: { date: string; revenue: number }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
  }[];
  lowStockAlerts: {
    variantId: string;
    productTitle: string;
    sku: string;
    size: string | null;
    color: string | null;
    stock: number;
    threshold: number;
  }[];
  topProducts: { productId: string; title: string; unitsSold: number; revenue: number }[];
}

const RANGE_OPTIONS = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

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

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/dashboard?days=${range}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-neutral-400">
          Overview of your store&apos;s performance
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : (
          <>
            <StatsCard
              label="Today's Revenue"
              value={formatPrice(data.stats.todayRevenue)}
              icon={<IndianRupee className="h-5 w-5" />}
            />
            <StatsCard
              label="Today's Orders"
              value={String(data.stats.todayOrders)}
              icon={<ShoppingBag className="h-5 w-5" />}
            />
            <StatsCard
              label="New Customers"
              value={String(data.stats.newCustomers)}
              icon={<Users className="h-5 w-5" />}
            />
            <StatsCard
              label="Low Stock Items"
              value={String(data.stats.lowStockCount)}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="font-medium text-gray-900 dark:text-white">Revenue</h2>
          <div className="flex gap-1 rounded-md bg-gray-100 p-0.5 dark:bg-neutral-800">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium",
                  range === opt.value
                    ? "bg-white text-gray-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                    : "text-gray-500 dark:text-neutral-400"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardBody>
          {loading || !data ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.revenueSeries}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000000" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-100 dark:stroke-neutral-800" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
                <Tooltip formatter={(value) => formatPrice(Number(value ?? 0))} />
                <Area type="monotone" dataKey="revenue" stroke="#000000" fill="url(#revenueGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-medium text-gray-900 dark:text-white">Recent Orders</h2>
          </CardHeader>
          <CardBody className="p-0">
            {loading || !data ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 dark:border-neutral-800 dark:text-neutral-400">
                    <th className="px-5 py-2 font-medium">Order</th>
                    <th className="px-5 py-2 font-medium">Customer</th>
                    <th className="px-5 py-2 font-medium">Total</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((o) => (
                    <tr key={o.id} className="border-b border-gray-50 last:border-0 dark:border-neutral-800/50">
                      <td className="px-5 py-2.5 font-medium text-gray-900 dark:text-white">{o.orderNumber}</td>
                      <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{o.customerName}</td>
                      <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{formatPrice(o.totalAmount)}</td>
                      <td className="px-5 py-2.5">
                        <Badge variant={STATUS_VARIANT[o.status] ?? "default"}>{o.status}</Badge>
                      </td>
                    </tr>
                  ))}
                  {data.recentOrders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-gray-400">
                        No orders yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-medium text-gray-900 dark:text-white">Low Stock Alerts</h2>
          </CardHeader>
          <CardBody className="p-0">
            {loading || !data ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : data.lowStockAlerts.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-gray-400">All stock levels healthy</p>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-neutral-800/50">
                {data.lowStockAlerts.map((v) => (
                  <li key={v.variantId} className="flex items-center justify-between px-5 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{v.productTitle}</p>
                      <p className="text-xs text-gray-500 dark:text-neutral-400">
                        {v.sku} {v.size ? `· ${v.size}` : ""} {v.color ? `· ${v.color}` : ""}
                      </p>
                    </div>
                    <Badge variant={v.stock === 0 ? "error" : "warning"}>{v.stock} left</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-medium text-gray-900 dark:text-white">Top Selling Products</h2>
        </CardHeader>
        <CardBody className="p-0">
          {loading || !data ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : data.topProducts.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-gray-400">No sales data yet</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="px-5 py-2 font-medium">Product</th>
                  <th className="px-5 py-2 font-medium">Units Sold</th>
                  <th className="px-5 py-2 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((p) => (
                  <tr key={p.productId} className="border-b border-gray-50 last:border-0 dark:border-neutral-800/50">
                    <td className="px-5 py-2.5 font-medium text-gray-900 dark:text-white">{p.title}</td>
                    <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{p.unitsSold}</td>
                    <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{formatPrice(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
