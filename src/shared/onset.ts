// Pure onset-detection math: no CEP/AE imports. The Node side (src/js/lib/services/onset.ts)
// decodes audio to PCM with ffmpeg and hands plain sample arrays to computeRmsEnvelope, so all
// of the actual detection logic here is unit-testable with synthetic envelopes.
import type { TranscriptWord } from "./types";

export interface OnsetRefinementOptions {
  /** How far from Whisper's reported start to search, in seconds (the brief's "+/-150ms"). */
  windowSeconds: number;
  /** A hop counts as a rising edge once it crosses this fraction of the window's peak RMS. */
  thresholdRatio: number;
}

/** RMS (root-mean-square) energy per hop over a mono signal normalized to roughly [-1, 1]
 * (e.g. 16-bit PCM samples divided by 32768). hopSeconds is typically 0.01 (10ms). */
export const computeRmsEnvelope = (
  samples: ArrayLike<number>,
  sampleRate: number,
  hopSeconds: number
): number[] => {
  const hopSize = Math.max(1, Math.round(sampleRate * hopSeconds));
  const hops: number[] = [];
  for (let i = 0; i < samples.length; i += hopSize) {
    const end = Math.min(i + hopSize, samples.length);
    let sumSquares = 0;
    for (let j = i; j < end; j++) {
      const s = samples[j];
      sumSquares += s * s;
    }
    hops.push(Math.sqrt(sumSquares / (end - i)));
  }
  return hops;
};

/** Finds the energy onset (rising edge, not the peak) nearest reportedStart within
 * +/-windowSeconds. A "rising edge" is a hop whose RMS crosses at/above thresholdRatio of the
 * window's peak RMS, coming from a previous hop below it — the moment energy starts, not
 * wherever it happens to be loudest. If several rising edges fall inside the window (e.g. two
 * words close together), the one closest in time to reportedStart wins. Falls back to
 * reportedStart unchanged if the window is silent (no hop reaches the threshold) or empty. */
export const findNearestOnset = (
  rmsEnvelope: number[],
  hopSeconds: number,
  reportedStart: number,
  options: OnsetRefinementOptions
): number => {
  if (!rmsEnvelope.length) return reportedStart;
  const windowHops = Math.max(1, Math.round(options.windowSeconds / hopSeconds));
  const centerHop = Math.round(reportedStart / hopSeconds);
  const lo = Math.max(0, centerHop - windowHops);
  const hi = Math.min(rmsEnvelope.length - 1, centerHop + windowHops);
  if (lo > hi) return reportedStart;

  let peak = 0;
  for (let i = lo; i <= hi; i++) peak = Math.max(peak, rmsEnvelope[i]);
  if (peak <= 0) return reportedStart;
  const threshold = peak * options.thresholdRatio;

  let bestHop: number | null = null;
  let bestDistance = Infinity;
  for (let i = lo; i <= hi; i++) {
    const prev = i > 0 ? rmsEnvelope[i - 1] : 0;
    const isRisingEdge = rmsEnvelope[i] >= threshold && prev < threshold;
    if (!isRisingEdge) continue;
    const distance = Math.abs(i * hopSeconds - reportedStart);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestHop = i;
    }
  }
  return bestHop === null ? reportedStart : bestHop * hopSeconds;
};

/** Refines every word's start against the same RMS envelope, then enforces the brief's "never
 * overlapping the previous word" rule (clamped to the previous word's end) and guards against
 * an onset landing implausibly close to/past the word's own reported end. Only `start` moves;
 * `end` is left as Whisper reported it (frame quantization/applySync downstream already
 * guarantees a sane minimum duration). */
export const refineWordStarts = (
  words: TranscriptWord[],
  rmsEnvelope: number[],
  hopSeconds: number,
  options: OnsetRefinementOptions
): TranscriptWord[] => {
  const out: TranscriptWord[] = [];
  let prevEnd = 0;
  for (const w of words) {
    let refinedStart = findNearestOnset(rmsEnvelope, hopSeconds, w.start, options);
    if (refinedStart < prevEnd) refinedStart = prevEnd;
    if (refinedStart > w.end - hopSeconds) refinedStart = Math.max(prevEnd, Math.min(w.start, w.end - hopSeconds));
    out.push({ text: w.text, start: refinedStart, end: w.end });
    prevEnd = Math.max(refinedStart, w.end);
  }
  return out;
};
