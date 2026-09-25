import { createPortal } from "react-dom";
import { cloneElement, isValidElement, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useFloatingPosition } from "./hooks";

export interface TooltipProps {
  content: string;
  children: ReactElement;
  delayMs?: number;
}

/** Wraps a single focusable/hoverable child and shows a small label near it after a short
 * hover or keyboard-focus delay. Not for anything interactive inside the tooltip itself -
 * use Popover for that. */
export const Tooltip = ({ content, children, delayMs = 400 }: TooltipProps) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const pos = useFloatingPosition(anchorRef, open, 8);

  const show = () => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpen(true), delayMs);
  };
  const hide = () => {
    window.clearTimeout(timerRef.current);
    setOpen(false);
  };

  const trigger: ReactNode = isValidElement(children)
    ? cloneElement(children as ReactElement<any>, {
        onMouseEnter: show,
        onMouseLeave: hide,
        onFocus: show,
        onBlur: hide,
      })
    : children;

  return (
    <div ref={anchorRef} style={{ display: "inline-flex" }}>
      {trigger}
      {open &&
        pos &&
        createPortal(
          <div className="gc-tooltip" style={{ top: pos.top, left: pos.left }} role="tooltip">
            {content}
          </div>,
          document.body
        )}
    </div>
  );
};
