import type { HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export const Card = ({ className, children, ...rest }: CardProps) => (
  <div className={`gc-card ${className || ""}`} {...rest}>
    {children}
  </div>
);
