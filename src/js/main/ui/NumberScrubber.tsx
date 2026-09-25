import { useRef, useState } from "react";

export interface NumberScrubberProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Value change per pixel dragged. Default 1. */
  step?: number;
  /** Decimal places to round to and display. Default 0. */
  precision?: number;
  suffix?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

const DRAG_THRESHOLD_PX = 3;

/** AE-style "hot text": drag left/right to change the value, click to type a precise one,
 * hold Shift while dragging to move 5x faster, Alt for 5x finer. Arrow keys work too when
 * focused, for a keyboard-only path. */
export const NumberScrubber = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  precision = 0,
  suffix,
  label,
  disabled,
  className,
  ...rest
}: NumberScrubberProps) => {
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState("");
  const dragState = useRef<{ startX: number; startValue: number; dragging: boolean } | null>(null);

  const clamp = (v: number) => {
    let out = v;
    if (min !== undefined) out = Math.max(min, out);
    if (max !== undefined) out = Math.min(max, out);
    return out;
  };
  const round = (v: number) => {
    const f = Math.pow(10, precision);
    return Math.round(v * f) / f;
  };
  const commit = (v: number) => onChange(clamp(round(v)));

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startValue: value, dragging: false };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ds = dragState.current;
    if (!ds) return;
    const dx = e.clientX - ds.startX;
    if (!ds.dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      ds.dragging = true;
    }
    const multiplier = e.shiftKey ? 5 : e.altKey ? 0.2 : 1;
    commit(ds.startValue + dx * step * multiplier);
  };

  const handlePointerUp = () => {
    const ds = dragState.current;
    dragState.current = null;
    if (ds && !ds.dragging) {
      setDraftText(String(round(value)));
      setEditing(true);
    }
  };

  const commitEdit = () => {
    const parsed = parseFloat(draftText);
    if (!Number.isNaN(parsed)) commit(parsed);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const multiplier = e.shiftKey ? 5 : e.altKey ? 0.2 : 1;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      commit(value + step * multiplier);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      commit(value - step * multiplier);
    } else if (e.key === "Enter") {
      setDraftText(String(round(value)));
      setEditing(true);
    }
  };

  const display = round(value).toFixed(precision);
  const control = editing ? (
    <input
      autoFocus
      className="gc-scrubber-input"
      value={draftText}
      inputMode="decimal"
      onChange={(e) => setDraftText(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={commitEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commitEdit();
        if (e.key === "Escape") setEditing(false);
      }}
    />
  ) : (
    <div
      className="gc-scrubber-value gc-num"
      role="spinbutton"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={rest["aria-label"] || label}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      <span>{display}</span>
      {suffix && <span className="gc-scrubber-suffix">{suffix}</span>}
    </div>
  );

  if (!label) {
    return (
      <div className={`gc-scrubber ${className || ""}`}>
        {control}
      </div>
    );
  }

  return (
    <div className={`gc-field ${className || ""}`}>
      <span className="gc-field-label">{label}</span>
      <div className="gc-scrubber">{control}</div>
    </div>
  );
};
