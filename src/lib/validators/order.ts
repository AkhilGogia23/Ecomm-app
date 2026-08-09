import { z } from "zod";

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
  shippingAddressId: z.string().optional(),
  shippingAddress: z
    .object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      phone: z.string().min(10),
      line1: z.string().min(1),
      line2: z.string().optional(),
      city: z.string().min(1),
      state: z.string().min(1),
      postalCode: z.string().min(4),
      country: z.string().default("India"),
    })
    .optional(),
  paymentMethod: z.enum(["RAZORPAY", "COD"]),
  couponCode: z.string().optional(),
  customerNotes: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "RETURNED",
    "REFUNDED",
  ]),
  note: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().optional(),
});

export const processRefundSchema = z.object({
  amount: z.number().min(0),
  reason: z.string().min(1),
  isFullRefund: z.boolean().default(false),
});
