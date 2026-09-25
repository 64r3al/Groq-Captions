import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, X, XCircle, Info } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss after this many ms. Default 4000, pass 0 to require manual dismissal. */
  durationMs?: number;
}

interface ToastEntry extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

/** Wrap the app once with <ToastProvider> and call useToast().show(...) anywhere below it to
 * surface a transient, stacked, auto-dismissing notification. */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      const duration = options.durationMs ?? 4000;
      setToasts((prev) => [...prev, { ...options, id }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {createPortal(
        <div className="gc-toast-stack">
          {toasts.map((toast) => {
            const Icon = ICONS[toast.variant || "info"];
            return (
              <div key={toast.id} className={`gc-toast gc-toast--${toast.variant || "info"}`} role="status">
                <Icon size={16} className="gc-toast-icon" />
                <div className="gc-toast-body">
                  <div className="gc-toast-title">{toast.title}</div>
                  {toast.description && <div className="gc-toast-description">{toast.description}</div>}
                </div>
                <button
                  type="button"
                  className="gc-toast-close"
                  aria-label="Dismiss"
                  onClick={() => dismiss(toast.id)}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
};
