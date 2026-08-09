import { prisma } from "../prisma";

export async function generateOrderNumber(): Promise<string> {
  const lastOrder = await prisma.order.findFirst({
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true },
  });

  let nextNumber = 10001;
  if (lastOrder?.orderNumber) {
    const match = lastOrder.orderNumber.match(/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `ORD-${nextNumber}`;
}
