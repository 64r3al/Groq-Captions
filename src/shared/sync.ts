// Pure word-sync math: no CEP/AE imports, so this is unit-testable with plain Vitest and
// reusable from the panel (where it actually runs — see docs/ARCHITECTURE.md's Phase 2 data
// flow) without pulling in Node or ExtendScript globals.
import type { TranscriptWord } from "./types";

/** Where a word's time sits relative to the whole pipeline: Groq gives us times relative to
 * whatever audio file we sent it (a chunk of the source, starting at `sourceOffset` seconds
 * into the source media); the layer places that source media in the comp at `startTime`,
 * scaled by `stretchPercent`. */
export interface TimeMapping {
  /** layer.startTime, comp-time seconds (may be negative). */
  startTime: number;
  /** Source-time seconds where the extracted/chunked audio we sent to Groq started. */
  sourceOffset: number;
  /** layer.stretch, e.g. 100 = normal speed. Must be > 0 (reversed layers are rejected before
   * this point, host-side). */
  stretchPercent: number;
}

/** compTime = layer.startTime + (sourceOffset + t) * (stretch / 100). */
export const sourceToCompTime = (t: number, mapping: TimeMapping): number =>
  mapping.startTime + (mapping.sourceOffset + t) * (mapping.stretchPercent / 100);

export interface MapWordsToCompOptions {
  mapping: TimeMapping;
  /** Layer inPoint clamped to >= 0, comp-time seconds. */
  inPoint: number;
  /** Layer outPoint clamped to <= comp.duration, comp-time seconds. */
  outPoint: number;
}

/** Converts Groq word times to comp time and drops/clamps to the layer's visible range.
 * A word entirely before inPoint or at/after outPoint is dropped; a word that straddles a
 * boundary is clamped to it (so it's still shown, just not before/after the layer is). */
export const mapWordsToComp = (
  words: TranscriptWord[],
  options: MapWordsToCompOptions
): TranscriptWord[] => {
  const out: TranscriptWord[] = [];
  for (const w of words) {
    const start = sourceToCompTime(w.start, options.mapping);
    const end = sourceToCompTime(w.end, options.mapping);
    if (end <= options.inPoint || start >= options.outPoint) continue;
    out.push({
      text: w.text,
      start: Math.max(start, options.inPoint),
      end: Math.min(end, options.outPoint),
    });
  }
  return out;
};

/** A word becomes visible on the frame containing its start: floor(t*fps + epsilon) / fps.
 * The small epsilon absorbs float error so a time that's conceptually exactly on a frame
 * boundary (e.g. 1.0 at 24fps) doesn't get floored down to the previous frame. Works for
 * NTSC rates (23.976, 29.97, 59.94) as long as the caller passes the precise fps value
 * (e.g. AE's comp.frameRate, 30000/1001…) rather than a rounded display value. */
export const snapToFrame = (t: number, fps: number): number =>
  Math.floor(t * fps + 1e-6) / fps;

export interface ApplySyncOptions {
  fps: number;
  /** User's global sync offset, in frames. Negative = earlier, positive = later. */
  offsetFrames: number;
}

/** Applies the global offset and frame-quantizes every word, then enforces that starts never
 * go backwards word-to-word (clamped to the previous word's start) and that every word lasts
 * at least one frame. Input must already be in comp time (see mapWordsToComp) and roughly
 * time-ordered by start. */
export const applySync = (
  words: TranscriptWord[],
  options: ApplySyncOptions
): TranscriptWord[] => {
  const frameDuration = 1 / options.fps;
  const offsetSeconds = options.offsetFrames / options.fps;
  const out: TranscriptWord[] = [];
  let prevStart = 0;
  for (const w of words) {
    let start = snapToFrame(Math.max(0, w.start + offsetSeconds), options.fps);
    if (start < prevStart) start = prevStart;
    let end = snapToFrame(Math.max(0, w.end + offsetSeconds), options.fps);
    if (end < start + frameDuration) end = start + frameDuration;
    out.push({ text: w.text, start, end });
    prevStart = start;
  }
  return out;
};

/** Convenience: maps Groq's source-relative words to comp time and applies sync in one call.
 * Kept as two composable steps above (mapWordsToComp, applySync) so each is independently
 * unit-testable; this is just what the panel actually calls. */
export const syncWords = (
  words: TranscriptWord[],
  mapOptions: MapWordsToCompOptions,
  syncOptions: ApplySyncOptions
): TranscriptWord[] => applySync(mapWordsToComp(words, mapOptions), syncOptions);
