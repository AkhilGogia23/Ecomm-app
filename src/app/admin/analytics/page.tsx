"use client";

import { useCallback, useEffect, useState } from "react";
import Papa from "papaparse";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Download } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import StatsCard from "@/components/ui/StatsCard";
import { formatPrice } from "@/lib/utils/price";
import { cn } from "@/lib/cn";

interface AnalyticsData {
  salesOverview: { totalRevenue: number; orderCount: number; aov: number; series: { date: string; revenue: number }[] };
  revenueByCategory: { category: string; revenue: number }[];
  topProducts: { productId: string; title: string; revenue: number; unitsSold: number; views: number }[];
  customerReport: { newCustomers: number; returningCustomers: number };
  inventoryReport: { totalStockValue: number; byCategory: { category: string; value: number }[] };
  couponPerformance: { code: string; usageCount: number; totalDiscount: number; revenue: number }[];
  abandonedCarts: { count: number; potentialRevenue: number };
}

const RANGE_OPTIONS = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);
  const [topProductsSort, setTopProductsSort] = useState<"revenue" | "unitsSold" | "views">("revenue");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${range}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on range change
    fetchData();
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const sortedTopProducts = [...data.topProducts].sort((a, b) => b[topProductsSort] - a[topProductsSort]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">Store performance reports</p>
        </div>
        <div className="flex gap-1 rounded-md bg-gray-100 p-0.5 dark:bg-neutral-800">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium",
                range === opt.value ? "bg-white text-gray-900 shadow-sm dark:bg-neutral-700 dark:text-white" : "text-gray-500 dark:text-neutral-400"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard label="Total Revenue" value={formatPrice(data.salesOverview.totalRevenue)} />
        <StatsCard label="Orders" value={String(data.salesOverview.orderCount)} />
        <StatsCard label="Average Order Value" value={formatPrice(data.salesOverview.aov)} />
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="font-medium text-gray-900 dark:text-white">Sales Overview</h2>
          <Button variant="outline" size="sm" onClick={() => exportCsv("sales-overview.csv", data.salesOverview.series)}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.salesOverview.series}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#000000" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-100 dark:stroke-neutral-800" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
              <Tooltip formatter={(value) => formatPrice(Number(value ?? 0))} />
              <Area type="monotone" dataKey="revenue" stroke="#000000" fill="url(#salesGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-medium text-gray-900 dark:text-white">Revenue by Category</h2>
            <Button variant="outline" size="sm" onClick={() => exportCsv("revenue-by-category.csv", data.revenueByCategory)}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </CardHeader>
          <CardBody>
            {data.revenueByCategory.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No sales data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.revenueByCategory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-100 dark:stroke-neutral-800" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
                  <Tooltip formatter={(value) => formatPrice(Number(value ?? 0))} />
                  <Bar dataKey="revenue" fill="#000000" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-medium text-gray-900 dark:text-white">Customer Report</h2>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{data.customerReport.newCustomers}</p>
              <p className="text-xs text-gray-500">New Customers</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{data.customerReport.returningCustomers}</p>
              <p className="text-xs text-gray-500">Returning Customers</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="font-medium text-gray-900 dark:text-white">Top Products</h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-md bg-gray-100 p-0.5 dark:bg-neutral-800">
              {(["revenue", "unitsSold", "views"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setTopProductsSort(key)}
                  className={cn(
                    "rounded px-2 py-1 text-xs font-medium capitalize",
                    topProductsSort === key ? "bg-white text-gray-900 shadow-sm dark:bg-neutral-700 dark:text-white" : "text-gray-500 dark:text-neutral-400"
                  )}
                >
                  {key === "unitsSold" ? "Units" : key}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => exportCsv("top-products.csv", sortedTopProducts)}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {sortedTopProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No sales data yet</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="px-5 py-2 font-medium">Product</th>
                  <th className="px-5 py-2 font-medium">Revenue</th>
                  <th className="px-5 py-2 font-medium">Units Sold</th>
                  <th className="px-5 py-2 font-medium">Views</th>
                </tr>
              </thead>
              <tbody>
                {sortedTopProducts.map((p) => (
                  <tr key={p.productId} className="border-b border-gray-50 last:border-0 dark:border-neutral-800/50">
                    <td className="px-5 py-2.5 font-medium text-gray-900 dark:text-white">{p.title}</td>
                    <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{formatPrice(p.revenue)}</td>
                    <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{p.unitsSold}</td>
                    <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{p.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-medium text-gray-900 dark:text-white">Inventory Report</h2>
          </CardHeader>
          <CardBody>
            <p className="mb-3 text-2xl font-semibold text-gray-900 dark:text-white">
              {formatPrice(data.inventoryReport.totalStockValue)}
            </p>
            <p className="mb-3 text-xs text-gray-500">Total stock value</p>
            <div className="space-y-1">
              {data.inventoryReport.byCategory.map((c) => (
                <div key={c.category} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-neutral-300">{c.category}</span>
                  <span className="text-gray-900 dark:text-white">{formatPrice(c.value)}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-medium text-gray-900 dark:text-white">Abandoned Carts</h2>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{data.abandonedCarts.count}</p>
              <p className="text-xs text-gray-500">Carts (&gt;1hr old)</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatPrice(data.abandonedCarts.potentialRevenue)}</p>
              <p className="text-xs text-gray-500">Potential Revenue</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="font-medium text-gray-900 dark:text-white">Coupon Performance</h2>
          <Button variant="outline" size="sm" onClick={() => exportCsv("coupon-performance.csv", data.couponPerformance)}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </CardHeader>
        <CardBody className="p-0">
          {data.couponPerformance.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No coupons yet</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="px-5 py-2 font-medium">Code</th>
                  <th className="px-5 py-2 font-medium">Times Used</th>
                  <th className="px-5 py-2 font-medium">Discount Given</th>
                  <th className="px-5 py-2 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.couponPerformance.map((c) => (
                  <tr key={c.code} className="border-b border-gray-50 last:border-0 dark:border-neutral-800/50">
                    <td className="px-5 py-2.5 font-mono font-medium text-gray-900 dark:text-white">{c.code}</td>
                    <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{c.usageCount}</td>
                    <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{formatPrice(c.totalDiscount)}</td>
                    <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{formatPrice(c.revenue)}</td>
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
