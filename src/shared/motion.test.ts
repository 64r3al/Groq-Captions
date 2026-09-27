import { describe, expect, it } from "vitest";
import { MOTION_OPTIONS, isMotionType, motionForAnimMode } from "./motion";
import { VIRAL_PRESETS } from "./presets";

describe("motionForAnimMode", () => {
  it("maps motion:<type> animModes directly", () => {
    expect(motionForAnimMode("motion:slide-up")).toBe("slide-up");
    expect(motionForAnimMode("motion:blur-in")).toBe("blur-in");
  });

  it("falls back to none for unknown or missing modes", () => {
    expect(motionForAnimMode("motion:nope")).toBe("none");
    expect(motionForAnimMode("not-a-mode")).toBe("none");
    expect(motionForAnimMode(undefined)).toBe("none");
  });

  it("maps the classic modes to their closest AE motion", () => {
    expect(motionForAnimMode("zoom-punch")).toBe("zoom-out");
    expect(motionForAnimMode("rain")).toBe("drop-in");
    expect(motionForAnimMode("rotate")).toBe("rotate");
  });

  it("has an explicit mapping for every preset", () => {
    for (const preset of VIRAL_PRESETS) {
      const mode = preset.animMode;
      const known = mode.startsWith("motion:") ? isMotionType(mode.slice(7)) : motionForAnimMode(mode) !== "none" || [
        "single-word", "underline", "stroke-fill", "shadow-pop", "marker", "split-color", "rainbow", "outline-pulse",
      ].includes(mode);
      expect(known, `${preset.id} (${mode})`).toBe(true);
    }
  });

  it("lists each motion once", () => {
    const values = MOTION_OPTIONS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
  });
});
