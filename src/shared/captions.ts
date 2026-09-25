// Pure caption-grouping logic (words -> captions with on-screen timing and wrapped text).
// No CEP/AE imports — unit-testable on its own. Input words must already be comp-time,
// frame-quantized, and time-ordered (see sync.ts).
import type { TranscriptWord } from "./types";

export interface CaptionGroup {
  words: TranscriptWord[];
  start: number;
  end: number;
  /** May contain "\n" between wrapped lines (see wrapLines). */
  text: string;
}

export interface GroupingOptions {
  maxWords: number;
  maxCharsPerLine: number;
  /** Hard cap on wrapped lines; text that still doesn't fit just overflows the last line
   * rather than creating a maxLines+1'th line. */
  maxLines: number;
  /** Force a break after a gap this long (seconds) between two words. */
  pauseBreakSeconds: number;
  /** How long a caption lingers after its last word if the next one is far enough away not
   * to need the full gap filled (see flickerGapSeconds). */
  holdSeconds: number;
  /** If the next caption starts within this many seconds of this one's last word, extend this
   * caption all the way to the next one's start instead of leaving a blank gap (avoids a
   * flicker of no captions for a fraction of a second). */
  flickerGapSeconds: number;
  fps: number;
  compDuration: number;
  uppercase: boolean;
}

const SENTENCE_END = /[.!?…]$/;

/** Greedily wraps text into at most maxLines lines, each up to maxCharsPerLine chars, except
 * the last allowed line takes whatever's left over (so the output is never more than
 * maxLines lines, at the cost of the last line sometimes running long). */
export const wrapLines = (text: string, maxCharsPerLine: number, maxLines: number): string => {
  if (maxLines <= 1 || text.length <= maxCharsPerLine) return text;
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const onLastAllowedLine = lines.length === maxLines - 1;
    if (!onLastAllowedLine && current && candidate.length > maxCharsPerLine) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.join("\n");
};

/** Groups a flat, time-ordered word list into on-screen captions: breaks on a word-count
 * cap, a character budget, sentence-ending punctuation, or a long pause, and computes each
 * caption's on-screen start/end (extending to the next caption if the gap is short, so there's
 * no flicker of blank screen, otherwise holding for holdSeconds after the last word). */
export const buildGroups = (
  words: TranscriptWord[],
  options: GroupingOptions
): CaptionGroup[] => {
  const raw: TranscriptWord[][] = [];
  let current: TranscriptWord[] = [];
  let chars = 0;
  const charBudget = options.maxCharsPerLine * options.maxLines;

  for (const w of words) {
    if (current.length) {
      const last = current[current.length - 1];
      const gap = w.start - last.end;
      const sentenceEnd = SENTENCE_END.test(last.text);
      if (
        current.length >= options.maxWords ||
        chars + 1 + w.text.length > charBudget ||
        gap > options.pauseBreakSeconds ||
        sentenceEnd
      ) {
        raw.push(current);
        current = [];
        chars = 0;
      }
    }
    chars += (current.length ? 1 : 0) + w.text.length;
    current.push(w);
  }
  if (current.length) raw.push(current);

  const frameDuration = 1 / options.fps;
  const groups: CaptionGroup[] = [];
  for (let i = 0; i < raw.length; i++) {
    const group = raw[i];
    const start = group[0].start;
    const lastEnd = group[group.length - 1].end;
    const next = i + 1 < raw.length ? raw[i + 1][0].start : Infinity;

    let end = next - lastEnd < options.flickerGapSeconds ? next : lastEnd + options.holdSeconds;
    if (end > next) end = next;
    if (end > options.compDuration) end = options.compDuration;
    if (end < start + frameDuration) end = start + frameDuration;

    let text = group.map((w) => w.text).join(" ");
    if (options.uppercase) text = text.toUpperCase();
    text = wrapLines(text, options.maxCharsPerLine, options.maxLines);

    groups.push({ words: group, start, end, text });
  }
  return groups;
};

/** Per-word reveal times for a caption's word-by-word animation: a word appears leadInFrames
 * early (never before the caption itself starts). Comp-time seconds, matching group.words'
 * own (already frame-quantized) times. */
export const revealTimes = (
  group: CaptionGroup,
  leadInFrames: number,
  fps: number
): number[] => {
  const leadInSeconds = leadInFrames / fps;
  return group.words.map((w) => Math.max(group.start, w.start - leadInSeconds));
};
