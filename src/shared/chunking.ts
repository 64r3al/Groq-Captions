// Pure logic for combining per-chunk transcription results back into one word list, when
// audio had to be split (see src/js/lib/services/groq.ts, which does the actual splitting
// and per-chunk API calls). No CEP/AE imports — unit-testable on its own.
import type { TranscriptWord } from "./types";

export interface TranscribedChunk {
  /** Word times relative to this chunk's own audio (0 = the first sample of the chunk). */
  words: TranscriptWord[];
  /** Where this chunk starts, in the *same* time axis every chunk shares (source-time
   * seconds, i.e. offset from the start of the full extracted/source audio). */
  offsetSeconds: number;
}

/** Chunks are produced with overlapSeconds of shared audio between neighbors specifically so
 * Whisper has context on both sides of the cut — which means the overlap region gets
 * transcribed twice (once by each chunk) and would duplicate words if simply concatenated.
 * We resolve that with a single deterministic cutover per boundary, at the midpoint of the
 * overlap: each chunk owns words up to the midpoint of its overlap with the *next* chunk, and
 * from the midpoint of its overlap with the *previous* one. This doesn't try to match text at
 * the seam (Whisper's transcription of the same audio twice isn't guaranteed to tokenize
 * identically) — a clean time-based split is simpler and just as correct in the normal case
 * where the overlap sits inside a natural gap, and it's the same tradeoff a human editor
 * would make with a razor blade. */
export const stitchTranscriptChunks = (
  chunks: TranscribedChunk[],
  overlapSeconds: number
): TranscriptWord[] => {
  if (!chunks.length) return [];
  const sorted = [...chunks].sort((a, b) => a.offsetSeconds - b.offsetSeconds);
  const out: TranscriptWord[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const chunk = sorted[i];
    const lowerBound =
      i > 0 ? chunk.offsetSeconds + overlapSeconds / 2 : -Infinity;
    const upperBound =
      i < sorted.length - 1 ? sorted[i + 1].offsetSeconds + overlapSeconds / 2 : Infinity;

    for (const w of chunk.words) {
      const start = w.start + chunk.offsetSeconds;
      if (start < lowerBound || start >= upperBound) continue;
      out.push({ text: w.text, start, end: w.end + chunk.offsetSeconds });
    }
  }
  return out;
};

/** Splits [0, totalDurationSeconds) into overlapping [start, end) windows no longer than
 * maxChunkSeconds, each overlapping the next by overlapSeconds (the last chunk just runs to
 * totalDurationSeconds, however short that makes it). Used to decide ffmpeg extraction ranges
 * before any transcription happens. */
export const planChunks = (
  totalDurationSeconds: number,
  maxChunkSeconds: number,
  overlapSeconds: number
): { start: number; duration: number }[] => {
  if (totalDurationSeconds <= maxChunkSeconds) {
    return [{ start: 0, duration: totalDurationSeconds }];
  }
  const step = maxChunkSeconds - overlapSeconds;
  if (step <= 0) {
    throw new Error("overlapSeconds must be smaller than maxChunkSeconds.");
  }
  const chunks: { start: number; duration: number }[] = [];
  let start = 0;
  while (start < totalDurationSeconds) {
    const end = Math.min(start + maxChunkSeconds, totalDurationSeconds);
    chunks.push({ start, duration: end - start });
    if (end >= totalDurationSeconds) break;
    start += step;
  }
  return chunks;
};
