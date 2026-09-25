import { describe, expect, it } from "vitest";
import { computeRmsEnvelope, findNearestOnset, refineWordStarts } from "./onset";
import type { TranscriptWord } from "./types";

describe("computeRmsEnvelope", () => {
  it("is all zero for silence", () => {
    const samples = new Array(1600).fill(0); // 100ms at 16kHz
    const env = computeRmsEnvelope(samples, 16000, 0.01);
    expect(env.every((v) => v === 0)).toBe(true);
  });

  it("produces one hop per hopSeconds of audio", () => {
    const samples = new Array(1600).fill(0); // exactly 100ms -> 10 hops of 10ms at 16kHz
    const env = computeRmsEnvelope(samples, 16000, 0.01);
    expect(env).toHaveLength(10);
  });

  it("reports full-scale RMS for a full-scale constant signal", () => {
    const samples = new Array(160).fill(1); // one 10ms hop, full amplitude
    const env = computeRmsEnvelope(samples, 16000, 0.01);
    expect(env[0]).toBeCloseTo(1, 9);
  });

  it("computes RMS, not average, for an alternating signal", () => {
    const samples = new Array(160).fill(0).map((_, i) => (i % 2 === 0 ? 1 : -1));
    const env = computeRmsEnvelope(samples, 16000, 0.01);
    // mean is 0, but RMS of a full-scale square wave is 1.
    expect(env[0]).toBeCloseTo(1, 9);
  });
});

// hopSeconds = 0.01 throughout: envelope index i <=> time i*0.01 seconds.
const options = { windowSeconds: 0.15, thresholdRatio: 0.25 };

const envelopeWithBurstAt = (hopIndex: number, length = 40): number[] => {
  const env = new Array(length).fill(0);
  env[hopIndex] = 0.8;
  env[hopIndex + 1] = 0.9;
  env[hopIndex + 2] = 0.7;
  return env;
};

describe("findNearestOnset", () => {
  it("snaps to a nearby rising edge", () => {
    const env = envelopeWithBurstAt(5); // onset at 0.05s
    expect(findNearestOnset(env, 0.01, 0.06, options)).toBeCloseTo(0.05, 9);
  });

  it("falls back to reportedStart when the window is silent", () => {
    const env = new Array(40).fill(0);
    expect(findNearestOnset(env, 0.01, 0.2, options)).toBe(0.2);
  });

  it("falls back to reportedStart for an empty envelope", () => {
    expect(findNearestOnset([], 0.01, 0.2, options)).toBe(0.2);
  });

  it("picks the closer of two rising edges in the window", () => {
    const env = new Array(40).fill(0);
    env[2] = 1.0; // onset at 0.02s
    env[3] = 0.9;
    env[4] = 0; // drop back to silence so the next rise is a separate edge
    env[10] = 1.0; // onset at 0.10s
    env[11] = 0.9;
    // reportedStart 0.09 is 0.07 from the first edge, 0.01 from the second.
    expect(findNearestOnset(env, 0.01, 0.09, options)).toBeCloseTo(0.1, 9);
  });

  it("clamps the search window to the envelope bounds near the start", () => {
    const env = envelopeWithBurstAt(0);
    expect(findNearestOnset(env, 0.01, 0.0, options)).toBeCloseTo(0, 9);
  });

  it("does not treat sustained energy already above threshold as a new onset", () => {
    // Energy is high for the whole window (e.g. a loud word already in progress) — there is
    // no rising edge inside it, so refinement should not invent one.
    const env = new Array(40).fill(0.8);
    expect(findNearestOnset(env, 0.01, 0.2, options)).toBe(0.2);
  });
});

describe("refineWordStarts", () => {
  const w = (text: string, start: number, end: number): TranscriptWord => ({ text, start, end });

  it("snaps a single word's start to the nearby onset", () => {
    const env = envelopeWithBurstAt(5);
    const out = refineWordStarts([w("hi", 0.06, 0.3)], env, 0.01, options);
    expect(out[0].start).toBeCloseTo(0.05, 9);
    expect(out[0].end).toBe(0.3); // end is left untouched
  });

  it("never lets a refined start fall before the previous word's end", () => {
    // Word 2's own onset search would want to snap earlier than word 1 ends.
    const env = new Array(60).fill(0);
    env[20] = 1; // 0.20s - inside word 1
    env[21] = 0.9;
    const words = [w("one", 0.1, 0.35), w("two", 0.22, 0.5)];
    const out = refineWordStarts(words, env, 0.01, options);
    expect(out[1].start).toBeGreaterThanOrEqual(out[0].end);
  });

  it("leaves a word's start unchanged (aside from clamping) when the window is silent", () => {
    const env = new Array(60).fill(0);
    const out = refineWordStarts([w("hi", 1, 1.3)], env, 0.01, options);
    expect(out[0].start).toBe(1);
  });
});
