"use client";

import { useEffect, useState, use, useCallback, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/utils/price";
import { toast } from "@/store/toast";

interface OrderItem {
  id: string;
  titleSnapshot: string;
  variantLabel: string | null;
  quantity: number;
  total: number;
  imagePathSnapshot: string | null;
}

interface TimelineEntry {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  trackingNumber: string | null;
  trackingUrl: string | null;
  deliveredAt: string | null;
  shippingAddressSnapshot: string | null;
  createdAt: string;
  items: OrderItem[];
  timeline: TimelineEntry[];
}

export default function AccountOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestingReturn, setRequestingReturn] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      const json = await res.json();
      if (json.success) setOrder(json.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    fetchOrder();
  }, [fetchOrder]);

  async function requestReturn() {
    setRequestingReturn(true);
    try {
      const res = await fetch(`/api/orders/${id}/return`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success("Return requested");
        fetchOrder();
      } else {
        toast.error(json.error ?? "Failed to request return");
      }
    } finally {
      setRequestingReturn(false);
    }
  }

  const [nowTs] = useState(() => Date.now());
  const canReturn = useMemo(() => {
    if (!order || order.status !== "DELIVERED" || !order.deliveredAt) return false;
    return (nowTs - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60 * 24) <= 7;
  }, [order, nowTs]);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!order) return <EmptyState title="Order not found" />;

  const shippingAddress = order.shippingAddressSnapshot ? JSON.parse(order.shippingAddressSnapshot) : null;

  return (
    <div className="space-y-4">
      <Link href="/account/orders" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:text-neutral-400">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{order.orderNumber}</h1>
          <p className="text-xs text-gray-500 dark:text-neutral-400">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <Badge variant="info">{order.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-medium text-gray-900 dark:text-white">Items</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="h-16 w-14 overflow-hidden rounded-md bg-gray-100 dark:bg-neutral-800">
                {item.imagePathSnapshot && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imagePathSnapshot} alt={item.titleSnapshot} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{item.titleSnapshot}</p>
                <p className="text-xs text-gray-500">{item.variantLabel} × {item.quantity}</p>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{formatPrice(item.total)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-gray-100 pt-3 text-sm font-semibold text-gray-900 dark:border-neutral-800 dark:text-white">
            <span>Total</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
        </CardBody>
      </Card>

      {(order.trackingNumber || order.status !== "DELIVERED") && (
        <Card>
          <CardHeader>
            <h2 className="font-medium text-gray-900 dark:text-white">Tracking</h2>
          </CardHeader>
          <CardBody className="space-y-1 text-sm text-gray-600 dark:text-neutral-300">
            {order.trackingNumber ? (
              <>
                <p>Tracking Number: {order.trackingNumber}</p>
                {order.trackingUrl && (
                  <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                    Track Shipment
                  </a>
                )}
              </>
            ) : (
              <p className="text-gray-400">Tracking info will appear once shipped</p>
            )}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-medium text-gray-900 dark:text-white">Status History</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-3 border-l border-gray-200 pl-4 dark:border-neutral-800">
            {order.timeline.map((entry) => (
              <div key={entry.id}>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.status}</p>
                {entry.note && <p className="text-xs text-gray-500 dark:text-neutral-400">{entry.note}</p>}
                <p className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {shippingAddress && (
        <Card>
          <CardHeader>
            <h2 className="font-medium text-gray-900 dark:text-white">Shipping Address</h2>
          </CardHeader>
          <CardBody className="text-sm text-gray-600 dark:text-neutral-300">
            <p>{shippingAddress.firstName} {shippingAddress.lastName}</p>
            <p>{shippingAddress.line1}, {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}</p>
          </CardBody>
        </Card>
      )}

      {canReturn && (
        <Button variant="outline" onClick={requestReturn} loading={requestingReturn}>
          Request Return
        </Button>
      )}
    </div>
  );
}
