"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/utils/price";

interface OrderRow {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: { id: string }[];
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

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setOrders(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-64 w-full" />;

  if (orders.length === 0) {
    return <EmptyState title="No orders yet" description="Your order history will appear here." />;
  }

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">My Orders</h1>
      {orders.map((o) => (
        <Link key={o.id} href={`/account/orders/${o.id}`}>
          <Card className="transition-colors hover:border-gray-300 dark:hover:border-neutral-700">
            <CardBody className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{o.orderNumber}</p>
                <p className="text-xs text-gray-500 dark:text-neutral-400">
                  {o.items.length} item(s) · {new Date(o.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatPrice(o.totalAmount)}</span>
                <Badge variant={STATUS_VARIANT[o.status] ?? "default"}>{o.status}</Badge>
              </div>
            </CardBody>
          </Card>
        </Link>
      ))}
    </div>
  );
}
