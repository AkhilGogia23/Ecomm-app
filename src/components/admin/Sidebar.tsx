"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Layers,
  Tags,
  ShoppingCart,
  Users,
  Ticket,
  Boxes,
  Image as ImageIcon,
  FileText,
  Menu as MenuIcon,
  Star,
  BarChart3,
  Settings,
  ShieldCheck,
  History,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { checkPermission } from "@/lib/auth-utils";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  module: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Main",
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard, module: "*" }],
  },
  {
    title: "Catalog",
    items: [
      { label: "Products", href: "/admin/products", icon: Package, module: "products" },
      { label: "Categories", href: "/admin/categories", icon: FolderTree, module: "products" },
      { label: "Collections", href: "/admin/collections", icon: Layers, module: "products" },
      { label: "Tags", href: "/admin/tags", icon: Tags, module: "products" },
    ],
  },
  {
    title: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", icon: ShoppingCart, module: "orders" },
      { label: "Customers", href: "/admin/customers", icon: Users, module: "customers" },
      { label: "Coupons", href: "/admin/coupons", icon: Ticket, module: "coupons" },
    ],
  },
  {
    title: "Inventory",
    items: [{ label: "Stock Management", href: "/admin/inventory", icon: Boxes, module: "inventory" }],
  },
  {
    title: "Content",
    items: [
      { label: "Banners", href: "/admin/banners", icon: ImageIcon, module: "content" },
      { label: "Pages", href: "/admin/pages", icon: FileText, module: "content" },
      { label: "Navigation", href: "/admin/navigation", icon: MenuIcon, module: "content" },
      { label: "Reviews", href: "/admin/reviews", icon: Star, module: "reviews" },
    ],
  },
  {
    title: "Analytics",
    items: [{ label: "Reports", href: "/admin/analytics", icon: BarChart3, module: "analytics" }],
  },
  {
    title: "System",
    items: [
      { label: "Settings", href: "/admin/settings", icon: Settings, module: "settings" },
      { label: "Users & Roles", href: "/admin/users", icon: ShieldCheck, module: "*" },
      { label: "Audit Log", href: "/admin/audit-log", icon: History, module: "audit" },
      { label: "Error Log", href: "/admin/errors", icon: AlertTriangle, module: "audit" },
    ],
  },
];

interface SidebarProps {
  role: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ role, collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const content = (
    <>
      <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-neutral-800">
        {!collapsed && (
          <span className="truncate text-base font-semibold text-gray-900 dark:text-white">
            {process.env.NEXT_PUBLIC_APP_NAME ?? "Store Admin"}
          </span>
        )}
        <button
          onClick={onCloseMobile}
          className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800 md:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => checkPermission(role, item.module));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title} className="mb-4">
              {!collapsed && (
                <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-black text-white dark:bg-white dark:text-black"
                          : "text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-gray-200 bg-white transition-all duration-200 dark:border-neutral-800 dark:bg-neutral-900 md:flex",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onCloseMobile} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white dark:bg-neutral-900">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
