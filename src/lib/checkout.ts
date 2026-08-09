import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/utils/order-number";

export interface CheckoutItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export interface ShippingAddressInput {
  firstName: string;
  lastName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

interface ResolvedItem {
  productId: string;
  variantId: string | null;
  title: string;
  sku: string;
  variantLabel: string | null;
  unitPrice: number;
  quantity: number;
  total: number;
  imagePath: string | null;
}

export async function resolveCartItems(items: CheckoutItemInput[]) {
  const resolved: ResolvedItem[] = [];
  let subtotal = 0;

  for (const item of items) {
    const product = await prisma.product.findFirst({
      where: { id: item.productId, isDeleted: false, status: "ACTIVE" },
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
    });
    if (!product) throw new Error(`Product not found: ${item.productId}`);

    let unitPrice = product.salePrice ?? product.basePrice;
    let sku = product.sku;
    let variantLabel: string | null = null;
    let stock = 0;

    if (item.variantId) {
      const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
      if (!variant || variant.productId !== product.id) throw new Error(`Invalid variant for product ${product.title}`);
      unitPrice = variant.salePrice ?? variant.price ?? unitPrice;
      sku = variant.sku;
      variantLabel = [variant.size, variant.color].filter(Boolean).join(" / ") || null;
      stock = variant.stock;
    } else {
      const anyVariant = await prisma.productVariant.findFirst({ where: { productId: product.id } });
      stock = anyVariant?.stock ?? 0;
    }

    if (stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.title}`);
    }

    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;

    resolved.push({
      productId: product.id,
      variantId: item.variantId ?? null,
      title: product.title,
      sku,
      variantLabel,
      unitPrice,
      quantity: item.quantity,
      total: lineTotal,
      imagePath: product.images[0]?.filePath ?? null,
    });
  }

  return { resolved, subtotal };
}

export async function computeShipping(subtotal: number): Promise<number> {
  const setting = await prisma.siteSetting.findUnique({ where: { key: "shipping_rules" } });
  if (!setting) return 0;

  interface Rule { type: string; threshold: number | null; rate: number; active: boolean }
  let rules: Rule[] = [];
  try {
    rules = JSON.parse(setting.value);
  } catch {
    return 0;
  }

  const freeRule = rules.find((r) => r.active && r.type === "FREE_ABOVE" && r.threshold !== null && subtotal >= r.threshold);
  if (freeRule) return 0;

  const flatRule = rules.find((r) => r.active && r.type === "FLAT");
  return flatRule?.rate ?? 0;
}

export async function computeCoupon(couponCode: string | undefined, subtotal: number, userId?: string) {
  if (!couponCode) return { discount: 0, couponId: null as string | null, freeShipping: false };

  const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
  if (!coupon || !coupon.isActive) return { discount: 0, couponId: null, freeShipping: false };

  const now = new Date();
  if (coupon.startDate && now < coupon.startDate) return { discount: 0, couponId: null, freeShipping: false };
  if (coupon.endDate && now > coupon.endDate) return { discount: 0, couponId: null, freeShipping: false };
  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) return { discount: 0, couponId: null, freeShipping: false };
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return { discount: 0, couponId: null, freeShipping: false };

  if (userId) {
    const userUsageCount = await prisma.couponUsage.count({ where: { couponId: coupon.id, userId } });
    if (userUsageCount >= coupon.perUserLimit) return { discount: 0, couponId: null, freeShipping: false };
  }

  let discount = 0;
  if (coupon.type === "PERCENTAGE") {
    discount = (subtotal * coupon.value) / 100;
    if (coupon.maxDiscountAmount) discount = Math.min(discount, coupon.maxDiscountAmount);
  } else if (coupon.type === "FIXED") {
    discount = Math.min(coupon.value, subtotal);
  }

  return { discount: Math.round(discount * 100) / 100, couponId: coupon.id, freeShipping: coupon.type === "FREE_SHIPPING" };
}

export async function createOrderFromCart(params: {
  customerId: string;
  items: CheckoutItemInput[];
  shippingAddress: ShippingAddressInput;
  paymentMethod: "RAZORPAY" | "COD";
  couponCode?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  customerNotes?: string;
}) {
  const { resolved, subtotal } = await resolveCartItems(params.items);
  const shippingAmount = await computeShipping(subtotal);
  const { discount, couponId, freeShipping } = await computeCoupon(params.couponCode, subtotal, params.customerId);
  const taxAmount = 0;
  const finalShipping = freeShipping ? 0 : shippingAmount;
  const totalAmount = Math.max(0, subtotal - discount + finalShipping + taxAmount);

  const orderNumber = await generateOrderNumber();

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        customerId: params.customerId,
        status: "CONFIRMED",
        paymentStatus: params.paymentMethod === "COD" ? "PENDING" : "PAID",
        paymentMethod: params.paymentMethod,
        razorpayOrderId: params.razorpayOrderId,
        razorpaySignature: params.razorpaySignature,
        subtotal,
        discountAmount: discount,
        taxAmount,
        shippingAmount: finalShipping,
        totalAmount,
        shippingAddressSnapshot: JSON.stringify(params.shippingAddress),
        couponId: couponId ?? undefined,
        couponCode: couponId ? params.couponCode?.toUpperCase() : undefined,
        customerNotes: params.customerNotes,
        items: {
          create: resolved.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            titleSnapshot: item.title,
            skuSnapshot: item.sku,
            variantLabel: item.variantLabel,
            priceAtPurchase: item.unitPrice,
            quantity: item.quantity,
            total: item.total,
            imagePathSnapshot: item.imagePath,
          })),
        },
        timeline: {
          create: { status: "CONFIRMED", note: "Order placed", changedBy: "Customer" },
        },
      },
      include: { items: true },
    });

    for (const item of resolved) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    if (couponId) {
      await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
      await tx.couponUsage.create({
        data: { couponId, userId: params.customerId, orderId: created.id, discountApplied: discount },
      });
    }

    return created;
  });

  return order;
}
