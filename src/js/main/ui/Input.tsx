import type { InputHTMLAttributes, ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: boolean;
}

export const Input = ({ label, icon, error, className, id, ...rest }: InputProps) => {
  const inputId = id || (label ? `gc-input-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const field = (
    <div className={`gc-input-shell${error ? " gc-input-shell--error" : ""}`}>
      {icon && <span className="gc-input-icon">{icon}</span>}
      <input id={inputId} className="gc-input" {...rest} />
    </div>
  );

  if (!label) return <div className={`gc-field ${className || ""}`}>{field}</div>;

  return (
    <label className={`gc-field ${className || ""}`} htmlFor={inputId}>
      <span className="gc-field-label">{label}</span>
      {field}
    </label>
  );
};
