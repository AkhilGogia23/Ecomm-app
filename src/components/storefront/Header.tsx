"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, Search, Heart, ShoppingBag, User, ChevronDown } from "lucide-react";
import { useCartStore } from "@/store/cart";
import SearchModal from "./SearchModal";
import CartDrawer from "./CartDrawer";
import { cn } from "@/lib/cn";

interface NavItem {
  id: string;
  label: string;
  url: string;
}

export default function Header() {
  const { data: session } = useSession();
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [announcement, setAnnouncement] = useState<{ text: string; active: boolean } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const totalItems = useCartStore((s) => s.totalItems());
  const openCart = useCartStore((s) => s.open);

  useEffect(() => {
    fetch("/api/navigation?position=HEADER")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setNavItems(json.data);
      });
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setAnnouncement({ text: json.data.announcement_text ?? "", active: !!json.data.announcement_active });
        }
      });
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {announcement?.active && !dismissed && announcement.text && (
        <div className="relative bg-black px-4 py-2 text-center text-xs text-white dark:bg-white dark:text-black">
          {announcement.text}
          <button
            onClick={() => setDismissed(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            aria-label="Dismiss announcement"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <header
        className={cn(
          "sticky top-0 z-40 border-b border-transparent bg-white/95 backdrop-blur transition-shadow dark:bg-neutral-950/95",
          scrolled && "border-gray-200 shadow-sm dark:border-neutral-800"
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <button onClick={() => setMobileOpen(true)} className="text-gray-700 dark:text-neutral-300 md:hidden" aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </button>

          <Link href="/" className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
            {process.env.NEXT_PUBLIC_APP_NAME ?? "My Clothing Store"}
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.url}
                className="text-sm font-medium text-gray-700 hover:text-black dark:text-neutral-300 dark:hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => setSearchOpen(true)} aria-label="Search" className="text-gray-700 dark:text-neutral-300">
              <Search className="h-5 w-5" />
            </button>
            <Link href="/account/wishlist" aria-label="Wishlist" className="hidden text-gray-700 dark:text-neutral-300 sm:block">
              <Heart className="h-5 w-5" />
            </Link>
            <button onClick={openCart} aria-label="Cart" className="relative text-gray-700 dark:text-neutral-300">
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[10px] text-white dark:bg-white dark:text-black">
                  {totalItems}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-label="Account"
                className="flex items-center gap-1 text-gray-700 dark:text-neutral-300"
              >
                <User className="h-5 w-5" />
                <ChevronDown className="hidden h-3 w-3 sm:block" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                  {session?.user ? (
                    <>
                      <Link href="/account" onClick={() => setUserMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-800">
                        My Account
                      </Link>
                      <Link href="/account/orders" onClick={() => setUserMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-800">
                        Orders
                      </Link>
                      <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/auth/login" onClick={() => setUserMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-800">
                        Sign In
                      </Link>
                      <Link href="/auth/register" onClick={() => setUserMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-800">
                        Create Account
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white p-4 dark:bg-neutral-900">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold text-gray-900 dark:text-white">Menu</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.url}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer />
    </>
  );
}
