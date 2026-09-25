import { AlertTriangle, OctagonAlert } from "lucide-react";
import type { ReactNode } from "react";

export interface InlineErrorProps {
  message: string;
  variant?: "error" | "warning";
  action?: ReactNode;
}

/** An inline, non-blocking error/warning banner shown in-flow (e.g. below the API key field, or
 * above a failed pipeline stage) rather than as a toast - used when the message needs to stay
 * visible until the user acts on it. */
export const InlineError = ({ message, variant = "error", action }: InlineErrorProps) => {
  const Icon = variant === "warning" ? AlertTriangle : OctagonAlert;
  return (
    <div className={`gc-inline-error${variant === "warning" ? " gc-inline-error--warning" : ""}`} role="alert">
      <Icon size={14} className="gc-inline-error-icon" />
      <div className="gc-inline-error-body">
        <span className="gc-inline-error-message">{message}</span>
        {action}
      </div>
    </div>
  );
};
