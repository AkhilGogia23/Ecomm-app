"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils/price";
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

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-checkout-script")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { items, totalPrice, clear } = useCartStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [newAddress, setNewAddress] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [codEnabled, setCodEnabled] = useState(true);
  const [codLimit, setCodLimit] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"RAZORPAY" | "COD">("RAZORPAY");
  const [placing, setPlacing] = useState(false);
  const [couponCode, setCouponCode] = useState<string | undefined>(undefined);

  useEffect(() => {
    const stored = sessionStorage.getItem("applied-coupon");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once-per-mount from sessionStorage
    if (stored) setCouponCode(stored);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/checkout");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/addresses")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setAddresses(json.data);
          const def = json.data.find((a: Address) => a.isDefault);
          if (def) setSelectedAddressId(def.id);
          else if (json.data.length === 0) setUseNewAddress(true);
        }
      });
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setCodEnabled(!!json.data.cod_enabled);
          setCodLimit(json.data.cod_limit ?? null);
        }
      });
  }, [session?.user]);

  const subtotal = totalPrice();
  const codUnavailable = codLimit !== null && subtotal > codLimit;

  function getShippingAddress() {
    if (!useNewAddress) {
      const addr = addresses.find((a) => a.id === selectedAddressId);
      if (!addr) return null;
      return {
        firstName: addr.firstName,
        lastName: addr.lastName,
        phone: addr.phone,
        line1: addr.line1,
        line2: addr.line2 ?? undefined,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postalCode,
        country: addr.country,
      };
    }
    if (!newAddress.firstName || !newAddress.line1 || !newAddress.city || !newAddress.postalCode) return null;
    return newAddress;
  }

  async function handlePlaceOrder() {
    const shippingAddress = getShippingAddress();
    if (!shippingAddress) {
      toast.error("Please provide a complete shipping address");
      return;
    }
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    const cartItems = items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }));

    setPlacing(true);
    try {
      if (paymentMethod === "COD") {
        const res = await fetch("/api/checkout/place-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: cartItems, shippingAddress, couponCode }),
        });
        const json = await res.json();
        if (json.success) {
          clear();
          sessionStorage.removeItem("applied-coupon");
          router.push(`/checkout/success?order=${json.data.orderNumber}`);
        } else {
          toast.error(json.error ?? "Failed to place order");
        }
        return;
      }

      const createRes = await fetch("/api/checkout/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cartItems, couponCode }),
      });
      const createJson = await createRes.json();
      if (!createJson.success) {
        toast.error(createJson.error ?? "Failed to initiate payment");
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load payment gateway");
        return;
      }

      const rzp = new window.Razorpay({
        key: createJson.data.keyId,
        amount: createJson.data.amount,
        currency: createJson.data.currency,
        order_id: createJson.data.razorpayOrderId,
        name: process.env.NEXT_PUBLIC_APP_NAME ?? "My Clothing Store",
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch("/api/checkout/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...response,
              items: cartItems,
              shippingAddress,
              couponCode,
            }),
          });
          const verifyJson = await verifyRes.json();
          if (verifyJson.success) {
            clear();
            sessionStorage.removeItem("applied-coupon");
            router.push(`/checkout/success?order=${verifyJson.data.orderNumber}`);
          } else {
            toast.error(verifyJson.error ?? "Payment verification failed");
          }
        },
        prefill: { email: session?.user?.email ?? "", name: session?.user?.name ?? "" },
        theme: { color: "#000000" },
      });
      rzp.open();
    } finally {
      setPlacing(false);
    }
  }

  if (status === "loading") return null;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState title="Your cart is empty" description="Add items to your cart before checking out." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">Checkout</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="font-medium text-gray-900 dark:text-white">Contact</h2>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-gray-600 dark:text-neutral-300">{session?.user?.email}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-medium text-gray-900 dark:text-white">Shipping Address</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              {addresses.length > 0 && !useNewAddress && (
                <div className="space-y-2">
                  {addresses.map((a) => (
                    <label key={a.id} className="flex items-start gap-2 rounded-md border border-gray-200 p-3 text-sm dark:border-neutral-800">
                      <input
                        type="radio"
                        checked={selectedAddressId === a.id}
                        onChange={() => setSelectedAddressId(a.id)}
                        className="mt-1"
                      />
                      <span>
                        <strong>{a.firstName} {a.lastName}</strong> ({a.label})<br />
                        {a.line1}, {a.city}, {a.state} {a.postalCode}<br />
                        {a.phone}
                      </span>
                    </label>
                  ))}
                  <button onClick={() => setUseNewAddress(true)} className="text-sm text-gray-600 hover:underline dark:text-neutral-300">
                    + Use a different address
                  </button>
                </div>
              )}

              {(useNewAddress || addresses.length === 0) && (
                <div className="grid grid-cols-2 gap-3">
                  <Input label="First Name" value={newAddress.firstName} onChange={(e) => setNewAddress((a) => ({ ...a, firstName: e.target.value }))} />
                  <Input label="Last Name" value={newAddress.lastName} onChange={(e) => setNewAddress((a) => ({ ...a, lastName: e.target.value }))} />
                  <Input label="Phone" className="col-span-2" value={newAddress.phone} onChange={(e) => setNewAddress((a) => ({ ...a, phone: e.target.value }))} />
                  <Input label="Address Line 1" className="col-span-2" value={newAddress.line1} onChange={(e) => setNewAddress((a) => ({ ...a, line1: e.target.value }))} />
                  <Input label="Address Line 2" className="col-span-2" value={newAddress.line2} onChange={(e) => setNewAddress((a) => ({ ...a, line2: e.target.value }))} />
                  <Input label="City" value={newAddress.city} onChange={(e) => setNewAddress((a) => ({ ...a, city: e.target.value }))} />
                  <Input label="State" value={newAddress.state} onChange={(e) => setNewAddress((a) => ({ ...a, state: e.target.value }))} />
                  <Input label="Pincode" value={newAddress.postalCode} onChange={(e) => setNewAddress((a) => ({ ...a, postalCode: e.target.value }))} />
                  <Input label="Country" value={newAddress.country} onChange={(e) => setNewAddress((a) => ({ ...a, country: e.target.value }))} />
                  {addresses.length > 0 && (
                    <button onClick={() => setUseNewAddress(false)} className="col-span-2 text-left text-sm text-gray-600 hover:underline dark:text-neutral-300">
                      ← Use a saved address
                    </button>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-medium text-gray-900 dark:text-white">Payment</h2>
            </CardHeader>
            <CardBody className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-neutral-300">
                <input type="radio" checked={paymentMethod === "RAZORPAY"} onChange={() => setPaymentMethod("RAZORPAY")} />
                Pay Online (Card / UPI / Netbanking)
              </label>
              <label className={`flex items-center gap-2 text-sm ${codUnavailable || !codEnabled ? "text-gray-400" : "text-gray-700 dark:text-neutral-300"}`}>
                <input
                  type="radio"
                  checked={paymentMethod === "COD"}
                  disabled={codUnavailable || !codEnabled}
                  onChange={() => setPaymentMethod("COD")}
                />
                Cash on Delivery
                {codUnavailable && <span className="text-xs">(unavailable for this order value)</span>}
                {!codEnabled && <span className="text-xs">(currently unavailable)</span>}
              </label>
            </CardBody>
          </Card>
        </div>

        <div className="h-fit rounded-lg border border-gray-200 p-5 dark:border-neutral-800">
          <h2 className="mb-4 font-medium text-gray-900 dark:text-white">Order Summary</h2>
          <ul className="mb-4 space-y-2 text-sm">
            {items.map((item) => (
              <li key={`${item.productId}-${item.variantId}`} className="flex justify-between">
                <span className="text-gray-600 dark:text-neutral-300">
                  {item.title} × {item.quantity}
                </span>
                <span className="text-gray-900 dark:text-white">{formatPrice((item.salePrice ?? item.price) * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900 dark:border-neutral-800 dark:text-white">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">Shipping and discounts calculated at payment</p>
          <Button className="mt-4 w-full" onClick={handlePlaceOrder} loading={placing}>
            {paymentMethod === "COD" ? "Place Order" : "Pay Now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
