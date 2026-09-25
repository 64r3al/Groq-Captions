import type { TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: boolean;
}

export const Textarea = ({ label, error, className, id, rows = 2, ...rest }: TextareaProps) => {
  const areaId = id || (label ? `gc-textarea-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const field = (
    <div className={`gc-input-shell gc-input-shell--textarea${error ? " gc-input-shell--error" : ""}`}>
      <textarea id={areaId} className="gc-input" rows={rows} {...rest} />
    </div>
  );

  if (!label) return <div className={`gc-field ${className || ""}`}>{field}</div>;

  return (
    <label className={`gc-field ${className || ""}`} htmlFor={areaId}>
      <span className="gc-field-label">{label}</span>
      {field}
    </label>
  );
};
