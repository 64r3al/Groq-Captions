import type { ReactNode } from "react";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "accent";

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  /** Shows a small solid dot before the label (e.g. for a live/connected status pill). */
  dot?: boolean;
}

export const Badge = ({ children, variant = "default", dot }: BadgeProps) => (
  <span className={`gc-badge${variant !== "default" ? ` gc-badge--${variant}` : ""}`}>
    {dot && <span className="gc-badge-dot" />}
    {children}
  </span>
);
