import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/constants";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user || !ADMIN_ROLES.includes(session.user.role as (typeof ADMIN_ROLES)[number])) {
    redirect("/auth/login?callbackUrl=/admin");
  }

  return (
    <AdminShell userName={session.user.name ?? "Admin"} userEmail={session.user.email ?? ""} role={session.user.role}>
      {children}
    </AdminShell>
  );
}
