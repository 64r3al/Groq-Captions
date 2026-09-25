import { createPortal } from "react-dom";
import { useRef } from "react";
import type { ReactNode } from "react";
import { useClickOutside, useEscapeKey, useFloatingPosition } from "./hooks";

export interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A floating panel anchored to a trigger element, portaled to document.body (so it never
 * gets clipped by a scrolling ancestor), positioned via ui/hooks.ts#useFloatingPosition,
 * closing on outside click or Escape. Used by ColorSwatch and FontPicker. */
export const Popover = ({ open, onOpenChange, anchor, children, className }: PopoverProps) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const pos = useFloatingPosition(anchorRef, open);

  useClickOutside([anchorRef, popoverRef], () => onOpenChange(false), open);
  useEscapeKey(() => onOpenChange(false), open);

  return (
    <>
      <div ref={anchorRef} style={{ display: "inline-flex" }}>
        {anchor}
      </div>
      {open &&
        pos &&
        createPortal(
          <div
            ref={popoverRef}
            className={`gc-popover ${className || ""}`}
            style={{ top: pos.top, left: pos.left }}
            role="dialog"
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
};
