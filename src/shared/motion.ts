/** Per-word entry/emphasis motions the After Effects build knows how to animate. Each one is a
 * single Text Animator driven by the same per-word Expression Selector timing as the reveal. */
export type MotionType =
  | "none"
  | "slide-up"
  | "drop-in"
  | "slide-left"
  | "zoom-in"
  | "zoom-out"
  | "blur-in"
  | "tracking"
  | "skew"
  | "rotate"
  | "spin"
  | "squash"
  | "wave"
  | "shake"
  | "fade";

export const MOTION_OPTIONS: { value: MotionType; label: string }[] = [
  { value: "none", label: "Hard Cut" },
  { value: "slide-up", label: "Slide Up" },
  { value: "drop-in", label: "Drop In" },
  { value: "slide-left", label: "Slide In (Side)" },
  { value: "zoom-in", label: "Grow In" },
  { value: "zoom-out", label: "Slam (Zoom Out)" },
  { value: "blur-in", label: "Blur Focus" },
  { value: "tracking", label: "Letter Spread" },
  { value: "skew", label: "Skew Swipe" },
  { value: "rotate", label: "Tilt In" },
  { value: "spin", label: "Spin In" },
  { value: "squash", label: "Squash & Stretch" },
  { value: "wave", label: "Wave" },
  { value: "shake", label: "Shake" },
  { value: "fade", label: "Soft Fade" },
];

const MOTION_VALUES = new Set<string>(MOTION_OPTIONS.map((o) => o.value));

export const isMotionType = (value: string): value is MotionType => MOTION_VALUES.has(value);

/** Presets name their look with an animMode (used by the panel preview); this is the closest
 * motion After Effects can build for each. Modes whose look is color/box based rather than
 * movement (marker, stroke-fill, rainbow, ...) map to "none" and rely on highlight/pop. */
const ANIM_MODE_MOTION: Record<string, MotionType> = {
  "single-word": "none",
  underline: "none",
  rotate: "rotate",
  "stroke-fill": "none",
  sticker: "zoom-in",
  squash: "squash",
  "shadow-pop": "none",
  wave: "wave",
  marker: "none",
  "zoom-punch": "zoom-out",
  "split-color": "none",
  reddit: "slide-up",
  tweet: "slide-up",
  rainbow: "none",
  "blur-box": "blur-in",
  "progress-bar": "slide-up",
  "search-bar": "fade",
  "sticky-note": "slide-up",
  newspaper: "zoom-in",
  callout: "zoom-in",
  terminal: "fade",
  "stat-card": "slide-up",
  list: "slide-left",
  quote: "fade",
  timeline: "slide-left",
  echo: "blur-in",
  "lens-distort": "blur-in",
  datamosh: "shake",
  "outline-pulse": "none",
  repeater: "tracking",
  circle: "spin",
  invert: "fade",
  scatter: "tracking",
  scanline: "slide-up",
  impact: "zoom-out",
  hologram: "fade",
  collage: "rotate",
  graffiti: "skew",
  smoke: "blur-in",
  mirror: "fade",
  rain: "drop-in",
  "pixel-sort": "shake",
  crawl: "slide-up",
  stamp: "zoom-out",
  chapter: "fade",
  credits: "slide-up",
  thought: "fade",
  diary: "fade",
  "time-skip": "shake",
  "wes-anderson": "fade",
};

/** Kinetic Motion presets use `motion:<type>` as their animMode. */
export const motionForAnimMode = (animMode: string | undefined): MotionType => {
  if (!animMode) return "none";
  if (animMode.indexOf("motion:") === 0) {
    const m = animMode.slice("motion:".length);
    return isMotionType(m) ? m : "none";
  }
  return ANIM_MODE_MOTION[animMode] ?? "none";
};
