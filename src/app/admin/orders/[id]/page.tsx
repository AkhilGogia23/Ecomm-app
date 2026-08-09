"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/utils/price";
import { toast } from "@/store/toast";

interface OrderItem {
  id: string;
  titleSnapshot: string;
  skuSnapshot: string;
  variantLabel: string | null;
  priceAtPurchase: number;
  quantity: number;
  total: number;
}

interface TimelineEntry {
  id: string;
  status: string;
  note: string | null;
  changedBy: string | null;
  createdAt: string;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  paymentGatewayId: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  shippingAddressSnapshot: string | null;
  notes: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  createdAt: string;
  customer: { name: string; email: string; phone: string | null };
  items: OrderItem[];
  timeline: TimelineEntry[];
}

const STATUS_OPTIONS = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [updating, setUpdating] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [isFullRefund, setIsFullRefund] = useState(true);
  const [refunding, setRefunding] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      const json = await res.json();
      if (json.success) {
        setOrder(json.data);
        setNewStatus(json.data.status);
        setTrackingNumber(json.data.trackingNumber ?? "");
        setTrackingUrl(json.data.trackingUrl ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    fetchOrder();
  }, [fetchOrder]);

  async function handleStatusUpdate() {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, note: note || undefined, trackingNumber: trackingNumber || undefined, trackingUrl: trackingUrl || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Order status updated");
        setNote("");
        fetchOrder();
      } else {
        toast.error(json.error ?? "Failed to update status");
      }
    } finally {
      setUpdating(false);
    }
  }

  async function handleRefund() {
    if (!order) return;
    setRefunding(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: isFullRefund ? order.totalAmount : Number(refundAmount),
          reason: refundReason || "Customer request",
          isFullRefund,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Refund processed");
        setRefundOpen(false);
        setRefundAmount("");
        setRefundReason("");
        fetchOrder();
      } else {
        toast.error(json.error ?? "Failed to process refund");
      }
    } finally {
      setRefunding(false);
    }
  }

  function generateInvoice() {
    if (!order) return;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(process.env.NEXT_PUBLIC_APP_NAME ?? "My Clothing Store", 14, 20);
    doc.setFontSize(11);
    doc.text(`Invoice for Order ${order.orderNumber}`, 14, 28);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 14, 34);

    doc.text(`Bill To:`, 14, 44);
    doc.text(order.customer.name, 14, 50);
    doc.text(order.customer.email, 14, 56);

    autoTable(doc, {
      startY: 64,
      head: [["Item", "SKU", "Qty", "Price", "Total"]],
      body: order.items.map((item) => [
        item.titleSnapshot,
        item.skuSnapshot,
        String(item.quantity),
        formatPrice(item.priceAtPurchase),
        formatPrice(item.total),
      ]),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable?.finalY ?? 80;
    doc.text(`Subtotal: ${formatPrice(order.subtotal)}`, 140, finalY + 10);
    doc.text(`Discount: ${formatPrice(order.discountAmount)}`, 140, finalY + 16);
    doc.text(`Shipping: ${formatPrice(order.shippingAmount)}`, 140, finalY + 22);
    doc.text(`Tax: ${formatPrice(order.taxAmount)}`, 140, finalY + 28);
    doc.setFontSize(13);
    doc.text(`Total: ${formatPrice(order.totalAmount)}`, 140, finalY + 36);

    doc.save(`invoice-${order.orderNumber}.pdf`);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!order) {
    return <EmptyState title="Order not found" />;
  }

  const shippingAddress = order.shippingAddressSnapshot ? JSON.parse(order.shippingAddressSnapshot) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/orders" className="mb-1 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:text-neutral-400">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{order.orderNumber}</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            Placed {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateInvoice}>
            <FileDown className="h-4 w-4" /> Invoice
          </Button>
          <Button variant="destructive" onClick={() => setRefundOpen(true)}>
            Process Refund
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="font-medium text-gray-900 dark:text-white">Items</h2>
            </CardHeader>
            <CardBody className="p-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 dark:border-neutral-800 dark:text-neutral-400">
                    <th className="px-5 py-2 font-medium">Item</th>
                    <th className="px-5 py-2 font-medium">SKU</th>
                    <th className="px-5 py-2 font-medium">Qty</th>
                    <th className="px-5 py-2 font-medium">Price</th>
                    <th className="px-5 py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 last:border-0 dark:border-neutral-800/50">
                      <td className="px-5 py-2.5 font-medium text-gray-900 dark:text-white">
                        {item.titleSnapshot}
                        {item.variantLabel && <span className="text-gray-400"> ({item.variantLabel})</span>}
                      </td>
                      <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{item.skuSnapshot}</td>
                      <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{item.quantity}</td>
                      <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{formatPrice(item.priceAtPurchase)}</td>
                      <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{formatPrice(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
            <CardBody className="border-t border-gray-100 dark:border-neutral-800">
              <div className="ml-auto max-w-xs space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>-{formatPrice(order.discountAmount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{formatPrice(order.shippingAmount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatPrice(order.taxAmount)}</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold dark:border-neutral-800"><span>Total</span><span>{formatPrice(order.totalAmount)}</span></div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-medium text-gray-900 dark:text-white">Update Status</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <Select label="Status" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} options={STATUS_OPTIONS.map((s) => ({ label: s, value: s }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Tracking Number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                <Input label="Tracking URL" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>
              <Button onClick={handleStatusUpdate} loading={updating}>
                Update Status
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-medium text-gray-900 dark:text-white">Timeline</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4 border-l border-gray-200 pl-4 dark:border-neutral-800">
                {order.timeline.map((entry) => (
                  <div key={entry.id} className="relative">
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-black dark:bg-white" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.status}</p>
                    {entry.note && <p className="text-xs text-gray-500 dark:text-neutral-400">{entry.note}</p>}
                    <p className="text-xs text-gray-400">
                      {new Date(entry.createdAt).toLocaleString()} {entry.changedBy && `· ${entry.changedBy}`}
                    </p>
                  </div>
                ))}
                {order.timeline.length === 0 && <p className="text-sm text-gray-400">No history yet</p>}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-medium text-gray-900 dark:text-white">Customer</h2>
            </CardHeader>
            <CardBody className="space-y-1 text-sm">
              <p className="font-medium text-gray-900 dark:text-white">{order.customer.name}</p>
              <p className="text-gray-600 dark:text-neutral-300">{order.customer.email}</p>
              {order.customer.phone && <p className="text-gray-600 dark:text-neutral-300">{order.customer.phone}</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-medium text-gray-900 dark:text-white">Payment</h2>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Method</span><span>{order.paymentMethod ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge variant={order.paymentStatus === "PAID" ? "success" : "warning"}>{order.paymentStatus}</Badge></div>
              {order.paymentGatewayId && <div className="flex justify-between"><span className="text-gray-500">Gateway ID</span><span className="truncate text-xs">{order.paymentGatewayId}</span></div>}
            </CardBody>
          </Card>

          {shippingAddress && (
            <Card>
              <CardHeader>
                <h2 className="font-medium text-gray-900 dark:text-white">Shipping Address</h2>
              </CardHeader>
              <CardBody className="space-y-0.5 text-sm text-gray-600 dark:text-neutral-300">
                <p>{shippingAddress.firstName} {shippingAddress.lastName}</p>
                <p>{shippingAddress.line1}</p>
                {shippingAddress.line2 && <p>{shippingAddress.line2}</p>}
                <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}</p>
                <p>{shippingAddress.country}</p>
                <p>{shippingAddress.phone}</p>
              </CardBody>
            </Card>
          )}

          {order.notes && (
            <Card>
              <CardHeader>
                <h2 className="font-medium text-gray-900 dark:text-white">Internal Notes</h2>
              </CardHeader>
              <CardBody className="text-sm text-gray-600 dark:text-neutral-300">{order.notes}</CardBody>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="Process Refund"
        footer={
          <>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRefund} loading={refunding}>
              Process Refund
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={isFullRefund} onChange={() => setIsFullRefund(true)} />
              Full refund ({formatPrice(order.totalAmount)})
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={!isFullRefund} onChange={() => setIsFullRefund(false)} />
              Partial refund
            </label>
          </div>
          {!isFullRefund && (
            <Input label="Refund Amount" type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
          )}
          <Input label="Reason" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
