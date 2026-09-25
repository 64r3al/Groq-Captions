import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** A centered placeholder for a section with nothing in it yet, always paired with one clear
 * action (per the panel's "every state has one obvious next step" rule). */
export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div className="gc-empty-state">
    {icon && <span className="gc-empty-state-icon">{icon}</span>}
    <span className="gc-empty-state-title">{title}</span>
    {description && <span className="gc-empty-state-description">{description}</span>}
    {action}
  </div>
);
