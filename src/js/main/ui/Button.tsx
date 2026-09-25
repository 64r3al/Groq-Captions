import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  /** Leading icon (a lucide-react element, e.g. <RefreshCw size={14} />). */
  icon?: ReactNode;
  /** Renders as a square icon-only button. Provide aria-label for accessibility. */
  iconOnly?: boolean;
  loading?: boolean;
}

export const Button = ({
  variant = "secondary",
  size = "md",
  icon,
  iconOnly = false,
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) => {
  const classes = [
    "gc-button",
    `gc-button--${variant}`,
    size === "sm" ? "gc-button--sm" : "",
    iconOnly ? "gc-button--icon-only" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading ? (
        <Loader2 size={size === "sm" ? 12 : 14} className="gc-button-icon gc-button-spinner" />
      ) : icon ? (
        <span className="gc-button-icon">{icon}</span>
      ) : null}
      {!iconOnly && children}
    </button>
  );
};
