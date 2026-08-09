"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/utils/price";

interface CustomerDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  orders: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    items: { id: string }[];
  }[];
  addresses: {
    id: string;
    label: string;
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    isDefault: boolean;
  }[];
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    product: { title: string };
  }[];
  wishlistItems: {
    id: string;
    product: { id: string; title: string; basePrice: number; slug: string };
  }[];
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/customers/${id}`);
        const json = await res.json();
        if (json.success) setCustomer(json.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!customer) {
    return <EmptyState title="Customer not found" />;
  }

  const totalSpent = customer.orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/customers" className="mb-1 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:text-neutral-400">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to customers
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{customer.name}</h1>
        <p className="text-sm text-gray-500 dark:text-neutral-400">
          {customer.email} {customer.phone && `· ${customer.phone}`} · Joined {new Date(customer.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-sm text-gray-500 dark:text-neutral-400">Total Orders</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{customer.orders.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-500 dark:text-neutral-400">Total Spent</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatPrice(totalSpent)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-500 dark:text-neutral-400">Wishlist Items</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{customer.wishlistItems.length}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-medium text-gray-900 dark:text-white">Order History</h2>
        </CardHeader>
        <CardBody className="p-0">
          {customer.orders.length === 0 ? (
            <EmptyState title="No orders yet" />
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="px-5 py-2 font-medium">Order</th>
                  <th className="px-5 py-2 font-medium">Items</th>
                  <th className="px-5 py-2 font-medium">Total</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((o) => (
                  <tr key={o.id} className="border-b border-gray-50 last:border-0 dark:border-neutral-800/50">
                    <td className="px-5 py-2.5">
                      <Link href={`/admin/orders/${o.id}`} className="font-medium text-gray-900 hover:underline dark:text-white">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{o.items.length}</td>
                    <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{formatPrice(o.totalAmount)}</td>
                    <td className="px-5 py-2.5"><Badge variant="info">{o.status}</Badge></td>
                    <td className="px-5 py-2.5 text-gray-600 dark:text-neutral-300">{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-medium text-gray-900 dark:text-white">Saved Addresses</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {customer.addresses.length === 0 ? (
              <p className="text-sm text-gray-400">No saved addresses</p>
            ) : (
              customer.addresses.map((a) => (
                <div key={a.id} className="rounded-md border border-gray-200 p-3 text-sm dark:border-neutral-800">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="default">{a.label}</Badge>
                    {a.isDefault && <Badge variant="success">Default</Badge>}
                  </div>
                  <p className="text-gray-600 dark:text-neutral-300">
                    {a.line1}, {a.city}, {a.state} {a.postalCode}
                  </p>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-medium text-gray-900 dark:text-white">Reviews</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {customer.reviews.length === 0 ? (
              <p className="text-sm text-gray-400">No reviews written</p>
            ) : (
              customer.reviews.map((r) => (
                <div key={r.id} className="rounded-md border border-gray-200 p-3 text-sm dark:border-neutral-800">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-medium text-gray-900 dark:text-white">{r.product.title}</p>
                    <span className="flex items-center gap-0.5 text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-current" /> {r.rating}
                    </span>
                  </div>
                  {r.comment && <p className="text-gray-600 dark:text-neutral-300">{r.comment}</p>}
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-medium text-gray-900 dark:text-white">Wishlist</h2>
        </CardHeader>
        <CardBody>
          {customer.wishlistItems.length === 0 ? (
            <p className="text-sm text-gray-400">No wishlist items</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {customer.wishlistItems.map((w) => (
                <div key={w.id} className="rounded-md border border-gray-200 p-3 text-sm dark:border-neutral-800">
                  <p className="font-medium text-gray-900 dark:text-white">{w.product.title}</p>
                  <p className="text-gray-500 dark:text-neutral-400">{formatPrice(w.product.basePrice)}</p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
