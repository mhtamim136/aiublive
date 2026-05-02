"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
type Toast = { id: string; kind: ToastKind; title: string; description?: string };

type Ctx = {
  toast: (t: Omit<Toast, "id">) => void;
};

const ToastCtx = React.createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3500);
  }, []);

  const dismiss = (id: string) =>
    setToasts((prev) => prev.filter((x) => x.id !== id));

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon =
              t.kind === "success"
                ? CheckCircle2
                : t.kind === "error"
                  ? AlertTriangle
                  : Info;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-border bg-card/95 p-3.5 shadow-card backdrop-blur"
              >
                <span
                  className={cn(
                    "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                    t.kind === "success" && "bg-success/10 text-success",
                    t.kind === "error" && "bg-danger/10 text-danger",
                    t.kind === "info" && "bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t.title}</p>
                  {t.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {t.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
