import type { ReactNode } from "react";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  "aria-label"?: string;
}

export const Toggle = ({ checked, onChange, label, disabled, ...rest }: ToggleProps) => {
  return (
    <label className={`gc-toggle${disabled ? " gc-toggle--disabled" : ""}`}>
      <input
        type="checkbox"
        className="gc-toggle-input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        {...rest}
      />
      <span className="gc-toggle-track">
        <span className="gc-toggle-thumb" />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
};
