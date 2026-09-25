import { describe, expect, it } from "vitest";
import { planChunks, stitchTranscriptChunks, type TranscribedChunk } from "./chunking";

describe("planChunks", () => {
  it("returns a single chunk when audio already fits", () => {
    expect(planChunks(300, 600, 30)).toEqual([{ start: 0, duration: 300 }]);
  });

  it("splits longer audio into overlapping windows", () => {
    const chunks = planChunks(1000, 600, 30);
    expect(chunks[0]).toEqual({ start: 0, duration: 600 });
    // step = 600 - 30 = 570
    expect(chunks[1].start).toBeCloseTo(570, 9);
    // consecutive windows really do overlap by overlapSeconds
    expect(chunks[0].start + chunks[0].duration - chunks[1].start).toBeCloseTo(30, 9);
  });

  it("covers the full duration with no gaps", () => {
    const total = 1000;
    const chunks = planChunks(total, 600, 30);
    const last = chunks[chunks.length - 1];
    expect(last.start + last.duration).toBeCloseTo(total, 9);
  });

  it("throws if overlap isn't smaller than the chunk size", () => {
    expect(() => planChunks(1000, 60, 60)).toThrow();
  });
});

describe("stitchTranscriptChunks", () => {
  it("passes a single chunk through with its offset applied", () => {
    const chunks: TranscribedChunk[] = [
      { words: [{ text: "hi", start: 1, end: 1.2 }], offsetSeconds: 100 },
    ];
    expect(stitchTranscriptChunks(chunks, 30)).toEqual([{ text: "hi", start: 101, end: 101.2 }]);
  });

  it("drops the duplicated overlap region instead of keeping both copies", () => {
    // Chunk 0 covers source [0, 600); chunk 1 covers [570, 1170) — 30s overlap.
    // Both "independently" transcribed a word that falls inside the overlap.
    const chunks: TranscribedChunk[] = [
      {
        offsetSeconds: 0,
        words: [
          { text: "before", start: 500, end: 500.3 }, // well before the overlap
          { text: "shared", start: 590, end: 590.3 }, // inside the overlap, from chunk 0's pass
        ],
      },
      {
        offsetSeconds: 570,
        words: [
          { text: "shared", start: 20, end: 20.3 }, // 570+20=590, same word, from chunk 1's pass
          { text: "after", start: 100, end: 100.3 }, // 570+100=670, well after the overlap
        ],
      },
    ];
    const stitched = stitchTranscriptChunks(chunks, 30);
    const texts = stitched.map((w) => w.text);
    expect(texts.filter((t) => t === "shared")).toHaveLength(1);
    expect(texts).toEqual(["before", "shared", "after"]);
  });

  it("keeps output sorted by start time across chunk boundaries", () => {
    const chunks: TranscribedChunk[] = [
      { offsetSeconds: 570, words: [{ text: "b", start: 20, end: 20.3 }] },
      { offsetSeconds: 0, words: [{ text: "a", start: 10, end: 10.3 }] },
    ];
    const stitched = stitchTranscriptChunks(chunks, 30);
    expect(stitched.map((w) => w.text)).toEqual(["a", "b"]);
    for (let i = 1; i < stitched.length; i++) {
      expect(stitched[i].start).toBeGreaterThanOrEqual(stitched[i - 1].start);
    }
  });

  it("returns an empty array for no chunks", () => {
    expect(stitchTranscriptChunks([], 30)).toEqual([]);
  });

  it("assigns a word exactly at the cutover midpoint to the later chunk", () => {
    // cutover = chunk[1].offsetSeconds + overlap/2 = 570 + 15 = 585
    const chunks: TranscribedChunk[] = [
      { offsetSeconds: 0, words: [{ text: "onBoundary", start: 585, end: 585.2 }] },
      { offsetSeconds: 570, words: [] },
    ];
    const stitched = stitchTranscriptChunks(chunks, 30);
    expect(stitched).toEqual([]); // chunk 0's word at exactly the cutover belongs to chunk 1
  });
});
