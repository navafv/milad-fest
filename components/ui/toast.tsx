"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error";

export interface ToastState {
  variant: ToastVariant;
  message: string;
}

interface ToastProps {
  toast: ToastState | null;
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. Pass 0 to disable auto-dismiss. Defaults to 4000. */
  duration?: number;
}

/**
 * Shared toast for admin pages. Renders a fixed bottom-right banner styled
 * with the same dark-glass/emerald/rose tokens used across Results,
 * Settings, Exports, and Login, and announces itself to screen readers
 * via role="alert" + aria-live so async success/error state is never
 * silent (see audit 4.6).
 *
 * Usage:
 *   const [toast, setToast] = useState<ToastState | null>(null);
 *   setToast({ variant: 'success', message: 'Saved.' });
 *   <Toast toast={toast} onDismiss={() => setToast(null)} />
 */
export function Toast({ toast, onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (!toast || duration === 0) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [toast, duration, onDismiss]);

  if (!toast) return null;

  const isSuccess = toast.variant === "success";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3.5 text-sm font-medium shadow-xl ring-1",
        isSuccess
          ? "bg-emerald-500 text-emerald-950 ring-emerald-400/50"
          : "bg-rose-500 text-white ring-rose-400/50"
      )}
    >
      <span aria-hidden>{isSuccess ? "✓" : "✕"}</span>
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-2 opacity-70 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
