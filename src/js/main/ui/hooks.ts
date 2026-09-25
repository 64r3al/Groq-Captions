import { useCallback, useEffect, useRef, useState } from "react";

/** Calls onOutside when a pointer-down happens outside every ref in `refs`. Used by Popover/
 * ColorSwatch/Select-like dropdowns to close on outside click. */
export const useClickOutside = (
  refs: React.RefObject<HTMLElement | null>[],
  onOutside: () => void,
  active: boolean
): void => {
  useEffect(() => {
    if (!active) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      if (refs.some((r) => r.current?.contains(target))) return;
      onOutside();
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, onOutside]);
};

export const useEscapeKey = (onEscape: () => void, active: boolean): void => {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, onEscape]);
};

export interface FloatingPosition {
  top: number;
  left: number;
}

/** Positions a floating element (popover/tooltip) below-or-above an anchor, clamped to the
 * viewport horizontally. Recomputed on open and on scroll/resize while open - no dependency on
 * a positioning library, which this panel is too small to need. */
export const useFloatingPosition = (
  anchorRef: React.RefObject<HTMLElement | null>,
  open: boolean,
  gap = 6
): FloatingPosition | null => {
  const [pos, setPos] = useState<FloatingPosition | null>(null);

  const recompute = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < 160 && rect.top > spaceBelow;
    const top = placeAbove ? rect.top - gap : rect.bottom + gap;
    const left = Math.min(Math.max(rect.left, 8), window.innerWidth - 8);
    setPos({ top, left });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorRef]);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [open, recompute]);

  return pos;
};

/** Persists a small JSON-serializable value to localStorage, best-effort (private windows /
 * blocked storage just fall back to in-memory state for the session - see the artifact-storage
 * guidance this project otherwise follows: never let storage failures break rendering). */
export const usePersistedState = <T,>(key: string, initial: T): [T, (v: T) => void] => {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {
        // best-effort only
      }
    },
    [key]
  );

  return [value, set];
};

/** Runs `tick` on a requestAnimationFrame loop only while `active` is true - used by the live
 * caption preview so it never animates (or burns CPU) while its section is collapsed/offscreen. */
export const useAnimationFrameLoop = (tick: (t: number) => void, active: boolean): void => {
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const loop = (t: number) => {
      tickRef.current(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
};

/** True once the element has intersected the viewport at least partially - gates expensive
 * work (rAF loops, playhead polling) so collapsed/offscreen sections cost nothing. */
export const useInView = (ref: React.RefObject<HTMLElement | null>): boolean => {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.01,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
};

/** Tracks an element's content-box width via ResizeObserver - used by CaptionPreviewCanvas to
 * scale its sample text to the actual rendered frame size instead of a fixed panel width. */
export const useElementWidth = (ref: React.RefObject<HTMLElement | null>): number => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
};
