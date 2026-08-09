export function formatPrice(amount: number, currency = "INR"): string {
  const symbol = currency === "INR" ? "₹" : currency;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol}${formatted}`;
}

export function calculateDiscount(original: number, sale: number): number {
  if (original <= 0) return 0;
  return Math.round(((original - sale) / original) * 100);
}

export function calculateTax(amount: number, rate: number): number {
  return Math.round(((amount * rate) / 100) * 100) / 100;
}
