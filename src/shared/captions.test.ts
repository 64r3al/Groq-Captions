import { describe, expect, it } from "vitest";
import { buildGroups, revealTimes, wrapLines, type GroupingOptions } from "./captions";
import type { TranscriptWord } from "./types";

const baseOptions: GroupingOptions = {
  maxWords: 3,
  maxCharsPerLine: 20,
  maxLines: 2,
  pauseBreakSeconds: 0.45,
  holdSeconds: 0.35,
  flickerGapSeconds: 0.6,
  fps: 30,
  compDuration: 1000,
  uppercase: false,
};

const w = (text: string, start: number, end: number): TranscriptWord => ({ text, start, end });

describe("buildGroups", () => {
  it("breaks on the max-words cap", () => {
    const words = [w("a", 0, 0.1), w("b", 0.1, 0.2), w("c", 0.2, 0.3), w("d", 0.3, 0.4)];
    const groups = buildGroups(words, baseOptions);
    expect(groups).toHaveLength(2);
    expect(groups[0].words.map((x) => x.text)).toEqual(["a", "b", "c"]);
    expect(groups[1].words.map((x) => x.text)).toEqual(["d"]);
  });

  it("breaks on the character budget", () => {
    const words = [w("hello", 0, 0.1), w("world", 0.2, 0.3), w("x", 0.4, 0.5)];
    const groups = buildGroups(words, {
      ...baseOptions,
      maxWords: 10,
      maxCharsPerLine: 5,
      maxLines: 1,
    });
    // budget = 5*1 = 5; "hello" alone already uses it, so "world" must start a new group.
    expect(groups.length).toBeGreaterThan(1);
    expect(groups[0].words.map((x) => x.text)).toEqual(["hello"]);
  });

  it("breaks after sentence-ending punctuation", () => {
    const words = [w("Hi.", 0, 0.2), w("Bye", 0.3, 0.5)];
    const groups = buildGroups(words, { ...baseOptions, maxWords: 10 });
    expect(groups).toHaveLength(2);
  });

  it("breaks on a pause longer than pauseBreakSeconds", () => {
    const words = [w("a", 0, 0.1), w("b", 1.0, 1.1)]; // 0.9s gap > 0.45s
    const groups = buildGroups(words, { ...baseOptions, maxWords: 10 });
    expect(groups).toHaveLength(2);
  });

  it("does not break on a short pause", () => {
    const words = [w("a", 0, 0.1), w("b", 0.2, 0.3)]; // 0.1s gap
    const groups = buildGroups(words, { ...baseOptions, maxWords: 10 });
    expect(groups).toHaveLength(1);
  });

  it("extends a caption to the next one's start when the gap is short (no flicker)", () => {
    const words = [w("a.", 0, 1), w("b", 1.2, 1.4)]; // "a." forces its own group; gap 0.2s < 0.6s
    const groups = buildGroups(words, { ...baseOptions, maxWords: 10 });
    expect(groups[0].end).toBeCloseTo(1.2, 9);
  });

  it("holds for holdSeconds when the next caption is far away", () => {
    const words = [w("a.", 0, 1), w("b", 5, 5.2)];
    const groups = buildGroups(words, { ...baseOptions, maxWords: 10 });
    expect(groups[0].end).toBeCloseTo(1 + 0.35, 9);
  });

  it("caps the last caption's end at compDuration", () => {
    const words = [w("last", 9.9, 9.95)];
    const groups = buildGroups(words, { ...baseOptions, compDuration: 10 });
    expect(groups[0].end).toBeLessThanOrEqual(10);
  });

  it("gives a caption at least one frame of duration", () => {
    const words = [w("x", 1, 1.01)];
    const groups = buildGroups(words, { ...baseOptions, holdSeconds: 0, compDuration: 1.01 });
    expect(groups[0].end - groups[0].start).toBeGreaterThanOrEqual(1 / baseOptions.fps - 1e-9);
  });

  it("uppercases when requested", () => {
    const words = [w("hi", 0, 0.2)];
    const groups = buildGroups(words, { ...baseOptions, uppercase: true });
    expect(groups[0].text).toBe("HI");
  });

  it("returns an empty array for no words", () => {
    expect(buildGroups([], baseOptions)).toEqual([]);
  });
});

describe("wrapLines", () => {
  it("leaves short text on one line", () => {
    expect(wrapLines("hi there", 20, 2)).toBe("hi there");
  });

  it("wraps long text into at most maxLines lines", () => {
    const text = "one two three four five six seven";
    const wrapped = wrapLines(text, 12, 2);
    const lines = wrapped.split("\n");
    expect(lines.length).toBeLessThanOrEqual(2);
    expect(lines.join(" ").replace(/\n/g, " ")).toContain("seven");
  });

  it("never produces more than maxLines lines even if it overflows the char budget", () => {
    const text = "one two three four five six seven eight nine ten eleven twelve";
    const wrapped = wrapLines(text, 8, 2);
    expect(wrapped.split("\n")).toHaveLength(2);
  });

  it("returns the text unchanged when maxLines is 1", () => {
    const text = "one two three four five";
    expect(wrapLines(text, 8, 1)).toBe(text);
  });
});

describe("revealTimes", () => {
  it("shows each word leadInFrames early", () => {
    const group = {
      words: [w("a", 1, 1.2), w("b", 1.5, 1.7)],
      start: 0, // earlier than start - leadIn for both words, so the clamp below doesn't apply
      end: 2,
      text: "a b",
    };
    const times = revealTimes(group, 3, 30);
    expect(times[0]).toBeCloseTo(1 - 3 / 30, 9);
    expect(times[1]).toBeCloseTo(1.5 - 3 / 30, 9);
  });

  it("never reveals a word before the caption's own start", () => {
    const group = {
      words: [w("a", 1, 1.2)],
      start: 1,
      end: 2,
      text: "a",
    };
    const times = revealTimes(group, 30, 30); // 1 full second of lead-in, more than group.start
    expect(times[0]).toBe(1);
  });
});
