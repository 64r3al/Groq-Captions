import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Trailing content, e.g. a Badge showing step status. */
  action?: ReactNode;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}

export const SectionHeader = ({
  title,
  subtitle,
  icon,
  action,
  collapsible,
  open = true,
  onToggle,
}: SectionHeaderProps) => {
  const classes = [
    "gc-section-header",
    collapsible ? "gc-section-header--collapsible" : "",
    collapsible && open ? "gc-section-header--open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {collapsible && (
        <span className="gc-section-header-chevron">
          <ChevronRight size={14} />
        </span>
      )}
      {icon}
      <span className="gc-section-header-title-group">
        <span className="gc-section-header-title">{title}</span>
        {subtitle && <span className="gc-section-header-subtitle">{subtitle}</span>}
      </span>
      {action}
    </>
  );

  if (!collapsible) return <div className={classes}>{content}</div>;

  return (
    <button
      type="button"
      className={classes}
      aria-expanded={open}
      onClick={onToggle}
    >
      {content}
    </button>
  );
};

export interface CollapsibleSectionProps extends SectionHeaderProps {
  children: ReactNode;
}

/** A SectionHeader paired with an animated collapse body (CSS grid-template-rows trick, so it
 * measures nothing in JS and respects prefers-reduced-motion for free via mixins.transition). */
export const CollapsibleSection = ({ children, ...headerProps }: CollapsibleSectionProps) => {
  const open = headerProps.open ?? true;
  return (
    <div className="gc-card">
      <SectionHeader {...headerProps} collapsible />
      <div className={`gc-section-collapse${open ? "" : " gc-section-collapse--closed"}`}>
        <div className="gc-section-collapse-inner">
          <div className="gc-section-body">{children}</div>
        </div>
      </div>
    </div>
  );
};
