import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOrderFromCart, resolveCartItems } from "@/lib/checkout";
import { queueEmail } from "@/lib/email";
import { formatPrice } from "@/lib/utils/price";
import { logError } from "@/lib/error-logger";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { items, shippingAddress, couponCode, customerNotes } = body;

    const codSetting = await prisma.siteSetting.findUnique({ where: { key: "cod_enabled" } });
    const codEnabled = codSetting ? JSON.parse(codSetting.value) : true;
    if (!codEnabled) {
      return NextResponse.json({ success: false, data: null, error: "Cash on Delivery is currently unavailable" }, { status: 400 });
    }

    const codLimitSetting = await prisma.siteSetting.findUnique({ where: { key: "cod_limit" } });
    const codLimit = codLimitSetting ? JSON.parse(codLimitSetting.value) : null;

    const { subtotal } = await resolveCartItems(items);
    if (codLimit && subtotal > codLimit) {
      return NextResponse.json(
        { success: false, data: null, error: `Cash on Delivery is only available for orders under ${formatPrice(codLimit)}` },
        { status: 400 }
      );
    }

    const order = await createOrderFromCart({
      customerId: session.user.id,
      items,
      shippingAddress,
      paymentMethod: "COD",
      couponCode,
      customerNotes,
    });

    queueEmail({
      to: session.user.email ?? "",
      subject: `Order confirmed: ${order.orderNumber}`,
      html: `<div><h1>Thank you for your order!</h1><p>Your order ${order.orderNumber} totaling ${formatPrice(order.totalAmount)} has been placed and will be paid via Cash on Delivery.</p></div>`,
    });

    return NextResponse.json({ success: true, data: { orderId: order.id, orderNumber: order.orderNumber }, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to place order",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/checkout/place-order",
      method: "POST",
    });
    return NextResponse.json(
      { success: false, data: null, error: err instanceof Error ? err.message : "Failed to place order" },
      { status: 500 }
    );
  }
}
