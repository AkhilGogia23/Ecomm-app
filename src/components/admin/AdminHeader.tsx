"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, Bell, Moon, Sun, ChevronDown, LogOut, User as UserIcon, PanelLeftClose, PanelLeft } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { cn } from "@/lib/cn";

interface AdminHeaderProps {
  userName: string;
  userEmail: string;
  onToggleMobileSidebar: () => void;
  onToggleCollapsed: () => void;
  collapsed: boolean;
  unreadCount?: number;
}

function useDarkMode() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored === "dark";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync initial theme from localStorage on mount
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }

  return { dark, toggle };
}

function useCrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = seg
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return { label, href };
  });
  return crumbs.length > 0 ? crumbs : [{ label: "Dashboard", href: "/admin" }];
}

export default function AdminHeader({
  userName,
  userEmail,
  onToggleMobileSidebar,
  onToggleCollapsed,
  collapsed,
  unreadCount = 0,
}: AdminHeaderProps) {
  const { dark, toggle } = useDarkMode();
  const pathname = usePathname();
  const crumbs = useCrumbs(pathname);
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMobileSidebar}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800 md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={onToggleCollapsed}
          className="hidden rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800 md:block"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
        <Breadcrumbs items={crumbs} />
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={toggle}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>

        <button
          className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-neutral-800"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-xs font-medium text-white dark:bg-white dark:text-black">
              {userName.charAt(0).toUpperCase()}
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-gray-500 dark:text-neutral-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
              <div className="border-b border-gray-100 px-3 py-2 dark:border-neutral-800">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{userName}</p>
                <p className="truncate text-xs text-gray-500 dark:text-neutral-400">{userEmail}</p>
              </div>
              <button
                onClick={() => router.push("/admin/profile")}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                )}
              >
                <UserIcon className="h-4 w-4" /> Profile
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
