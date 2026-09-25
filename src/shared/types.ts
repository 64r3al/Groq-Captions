// Types shared between the CEP panel (src/js) and the ExtendScript host (src/jsx).
// Imported with `import type` on the host side so nothing runtime leaks into ES3 output.

/** Everything the panel needs to know about the layer the user has selected, gathered
 * host-side because only ExtendScript can read the AE project/comp/layer model. */
export interface SelectedAudioLayerInfo {
  compId: number;
  compName: string;
  compWidth: number;
  compHeight: number;
  compFrameRate: number;
  compDuration: number;
  layerIndex: number;
  layerName: string;
  sourceFilePath: string;
  sourceFileName: string;
  sourceFileSizeBytes: number;
  /** Layer's startTime in comp time (seconds); may be negative. */
  startTime: number;
  /** Layer's time-stretch percentage, e.g. 100 = normal speed. */
  stretchPercent: number;
  /** Layer inPoint clamped to >= 0, in comp time (seconds). */
  inPoint: number;
  /** Layer outPoint clamped to <= comp.duration, in comp time (seconds). */
  outPoint: number;
  /** Where inPoint falls inside the *source* media, in source-time seconds. */
  sourceInSeconds: number;
  /** How much of the source media is actually used, in source-time seconds. */
  sourceDurationSeconds: number;
}

/** A single word with start/end timestamps, in seconds relative to whatever clip produced it. */
export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
}

export type GroqModel = "whisper-large-v3" | "whisper-large-v3-turbo";

export interface GroqSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  avg_logprob?: number;
  no_speech_prob?: number;
}

/** Normalized result of a Groq transcription call (verbose_json), independent of whether
 * word-level timestamps were available (falls back to segments upstream if not). */
export interface TranscriptResult {
  text: string;
  language?: string;
  duration?: number;
  words: TranscriptWord[];
  segments: GroqSegment[];
}

export type ApiKeySource = "settings" | "env" | "none";

export interface ApiKeyStatus {
  source: ApiKeySource;
  /** Last 4 characters only, for display; the real key never round-trips to the UI unnecessarily. */
  last4: string;
}
