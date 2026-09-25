import { describe, expect, it } from "vitest";
import { applySync, mapWordsToComp, snapToFrame, sourceToCompTime, syncWords } from "./sync";
import type { TranscriptWord } from "./types";

describe("sourceToCompTime", () => {
  it("maps a word at the start of the extracted audio to startTime + sourceOffset", () => {
    const t = sourceToCompTime(0, { startTime: 5, sourceOffset: 2, stretchPercent: 100 });
    expect(t).toBeCloseTo(7, 9);
  });

  it("scales by stretch", () => {
    // 200% stretch = half speed: 1 second of source audio takes 2 seconds of comp time.
    const t = sourceToCompTime(1, { startTime: 0, sourceOffset: 0, stretchPercent: 200 });
    expect(t).toBeCloseTo(2, 9);
  });

  it("handles a negative layer startTime", () => {
    const t = sourceToCompTime(3, { startTime: -2, sourceOffset: 0, stretchPercent: 100 });
    expect(t).toBeCloseTo(1, 9);
  });
});

describe("mapWordsToComp", () => {
  const mapping = { startTime: 0, sourceOffset: 0, stretchPercent: 100 };

  it("drops a word entirely before inPoint", () => {
    const words: TranscriptWord[] = [{ text: "early", start: 0, end: 0.5 }];
    const out = mapWordsToComp(words, { mapping, inPoint: 1, outPoint: 10 });
    expect(out).toEqual([]);
  });

  it("drops a word entirely at/after outPoint", () => {
    const words: TranscriptWord[] = [{ text: "late", start: 10, end: 10.5 }];
    const out = mapWordsToComp(words, { mapping, inPoint: 0, outPoint: 10 });
    expect(out).toEqual([]);
  });

  it("clamps a word straddling inPoint", () => {
    const words: TranscriptWord[] = [{ text: "straddle", start: 0.5, end: 1.5 }];
    const out = mapWordsToComp(words, { mapping, inPoint: 1, outPoint: 10 });
    expect(out).toEqual([{ text: "straddle", start: 1, end: 1.5 }]);
  });

  it("clamps a word straddling outPoint", () => {
    const words: TranscriptWord[] = [{ text: "straddle", start: 9.5, end: 10.5 }];
    const out = mapWordsToComp(words, { mapping, inPoint: 0, outPoint: 10 });
    expect(out).toEqual([{ text: "straddle", start: 9.5, end: 10 }]);
  });

  it("keeps a fully-inside word untouched", () => {
    const words: TranscriptWord[] = [{ text: "hi", start: 2, end: 2.4 }];
    const out = mapWordsToComp(words, { mapping, inPoint: 0, outPoint: 10 });
    expect(out).toEqual([{ text: "hi", start: 2, end: 2.4 }]);
  });
});

describe("snapToFrame", () => {
  // The frame-rate list the acceptance test names explicitly, using AE's own precise
  // values for the NTSC rates rather than the rounded display numbers.
  const rates: Record<string, number> = {
    "23.976": 24000 / 1001,
    "24": 24,
    "25": 25,
    "29.97": 30000 / 1001,
    "30": 30,
    "50": 50,
    "59.94": 60000 / 1001,
    "60": 60,
  };

  it("floors to the containing frame for every required fps", () => {
    for (const [label, fps] of Object.entries(rates)) {
      const frameDuration = 1 / fps;
      // Halfway into frame 10 should still floor to frame 10, not round up to 11.
      const t = 10 * frameDuration + frameDuration * 0.5;
      const snapped = snapToFrame(t, fps);
      expect(snapped, `fps=${label}`).toBeCloseTo(10 * frameDuration, 9);
    }
  });

  it("doesn't floor a time exactly on a frame boundary down to the previous frame", () => {
    for (const fps of Object.values(rates)) {
      const boundary = 7 / fps;
      expect(snapToFrame(boundary, fps)).toBeCloseTo(boundary, 9);
    }
  });
});

describe("applySync", () => {
  const fps = 30;

  it("applies a positive offset (later)", () => {
    const out = applySync([{ text: "hi", start: 1, end: 1.2 }], { fps, offsetFrames: 3 });
    expect(out[0].start).toBeCloseTo(1 + 3 / fps, 9);
  });

  it("applies a negative offset (earlier), clamped at 0", () => {
    const out = applySync([{ text: "hi", start: 0.05, end: 0.2 }], {
      fps,
      offsetFrames: -10,
    });
    expect(out[0].start).toBe(0);
  });

  it("never lets a word start before the previous word's (snapped) start", () => {
    const words: TranscriptWord[] = [
      { text: "a", start: 1.0, end: 1.1 },
      { text: "b", start: 0.95, end: 1.05 }, // out of order / overlapping input
    ];
    const out = applySync(words, { fps, offsetFrames: 0 });
    expect(out[1].start).toBeGreaterThanOrEqual(out[0].start);
  });

  it("gives every word at least one frame of duration", () => {
    const out = applySync([{ text: "hi", start: 1, end: 1.0001 }], { fps, offsetFrames: 0 });
    expect(out[0].end - out[0].start).toBeCloseTo(1 / fps, 9);
  });
});

describe("acceptance test: counting with clear pauses, every word within ±1 frame", () => {
  // "one, two, three, four, five" — each word starts exactly on a whole second, well
  // separated, exactly the "clear pauses" scenario the brief asks for.
  const words: TranscriptWord[] = [
    { text: "one", start: 1.0, end: 1.3 },
    { text: "two", start: 2.0, end: 2.3 },
    { text: "three", start: 3.0, end: 3.4 },
    { text: "four", start: 4.0, end: 4.3 },
    { text: "five", start: 5.0, end: 5.3 },
  ];

  it.each([24, 30, 60])("stays within ±1 frame of the audible start at %ifps", (fps) => {
    const synced = syncWords(
      words,
      { mapping: { startTime: 0, sourceOffset: 0, stretchPercent: 100 }, inPoint: 0, outPoint: 100 },
      { fps, offsetFrames: 0 }
    );
    const frameDuration = 1 / fps;
    synced.forEach((w, i) => {
      expect(Math.abs(w.start - words[i].start)).toBeLessThanOrEqual(frameDuration);
    });
  });
});
