"use client";

import { useState, ReactNode } from "react";
import Sidebar from "./Sidebar";
import AdminHeader from "./AdminHeader";
import ToastContainer from "@/components/ui/Toast";

interface AdminShellProps {
  userName: string;
  userEmail: string;
  role: string;
  children: ReactNode;
}

export default function AdminShell({ userName, userEmail, role, children }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-neutral-950">
      <Sidebar
        role={role}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader
          userName={userName}
          userEmail={userEmail}
          onToggleMobileSidebar={() => setMobileOpen(true)}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
          collapsed={collapsed}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
      <ToastContainer />
    </div>
  );
}
