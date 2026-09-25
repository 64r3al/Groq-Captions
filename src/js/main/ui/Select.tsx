import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  options: SelectOption[];
}

export const Select = ({ label, options, className, id, ...rest }: SelectProps) => {
  const selectId = id || (label ? `gc-select-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const field = (
    <div className="gc-select-shell">
      <select id={selectId} className="gc-select" {...rest}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="gc-select-chevron" />
    </div>
  );

  if (!label) return <div className={`gc-field ${className || ""}`}>{field}</div>;

  return (
    <label className={`gc-field ${className || ""}`} htmlFor={selectId}>
      <span className="gc-field-label">{label}</span>
      {field}
    </label>
  );
};
