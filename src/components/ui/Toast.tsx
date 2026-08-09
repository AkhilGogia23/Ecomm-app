"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { useToastStore, type ToastVariant } from "@/store/toast";
import { cn } from "@/lib/cn";

const iconByVariant: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorByVariant: Record<ToastVariant, string> = {
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  warning: "bg-amber-500 text-white",
  info: "bg-neutral-900 text-white dark:bg-white dark:text-black",
};

function ToastEntry({ id, message, variant, duration }: { id: string; message: string; variant: ToastVariant; duration: number }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const Icon = iconByVariant[variant];

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, removeToast]);

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2 rounded-md px-4 py-3 text-sm shadow-lg min-w-[260px]",
        colorByVariant[variant]
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={() => removeToast(id)} aria-label="Dismiss">
        <X className="h-4 w-4 opacity-70 hover:opacity-100" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastEntry key={t.id} {...t} />
      ))}
    </div>
  );
}
