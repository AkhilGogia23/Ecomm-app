import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/auth-utils";
import { ADMIN_ROLES } from "@/lib/constants";

const PUBLIC_API_GET_ROUTES = ["/api/products", "/api/categories", "/api/search", "/api/banners"];

const ADMIN_MODULE_BY_PREFIX: { prefix: string; module: string }[] = [
  { prefix: "/api/admin/products", module: "products" },
  { prefix: "/api/admin/orders", module: "orders" },
  { prefix: "/api/admin/customers", module: "customers" },
  { prefix: "/api/admin/inventory", module: "inventory" },
  { prefix: "/api/admin/coupons", module: "coupons" },
  { prefix: "/api/admin/banners", module: "content" },
  { prefix: "/api/admin/pages", module: "content" },
  { prefix: "/api/admin/navigation", module: "content" },
  { prefix: "/api/admin/reviews", module: "reviews" },
  { prefix: "/api/admin/analytics", module: "analytics" },
  { prefix: "/api/admin/settings", module: "settings" },
  { prefix: "/api/admin/audit-log", module: "audit" },
  { prefix: "/api/admin/users", module: "*" },
];

function resolveModule(pathname: string): string {
  const match = ADMIN_MODULE_BY_PREFIX.find((m) => pathname.startsWith(m.prefix));
  return match?.module ?? "*";
}

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth as { user?: { id: string; role: string } } | null;
  const user = session?.user;

  const isApiRoute = pathname.startsWith("/api");

  // Public storefront API GET routes
  if (isApiRoute && req.method === "GET" && PUBLIC_API_GET_ROUTES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // NextAuth internal routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Admin pages
  if (pathname.startsWith("/admin")) {
    if (!user || !ADMIN_ROLES.includes(user.role as (typeof ADMIN_ROLES)[number])) {
      const loginUrl = new URL("/auth/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Admin API routes
  if (pathname.startsWith("/api/admin")) {
    if (!user || !ADMIN_ROLES.includes(user.role as (typeof ADMIN_ROLES)[number])) {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }
    const requiredModule = resolveModule(pathname);
    if (!checkPermission(user.role, requiredModule)) {
      return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // Customer account pages
  if (pathname.startsWith("/account")) {
    if (!user) {
      const loginUrl = new URL("/auth/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Customer-scoped API routes
  const customerApiPrefixes = ["/api/cart", "/api/orders", "/api/wishlist", "/api/addresses", "/api/reviews"];
  if (isApiRoute && customerApiPrefixes.some((p) => pathname.startsWith(p))) {
    if (!user) {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/account/:path*",
    "/api/admin/:path*",
    "/api/cart/:path*",
    "/api/orders/:path*",
    "/api/wishlist/:path*",
    "/api/addresses/:path*",
    "/api/reviews/:path*",
  ],
};
