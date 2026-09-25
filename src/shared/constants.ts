import type { GroqModel } from "./types";

export const GROQ_TRANSCRIPTION_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";
export const GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models";

/** Free-tier upload ceiling. Kept slightly under the documented 25 MB so base64/boundary
 * overhead never pushes a request over the server's real limit. */
export const MAX_UPLOAD_BYTES = 24.5 * 1024 * 1024;

/** Extensions Groq will accept as a direct upload (no ffmpeg re-encode needed). */
export const DIRECT_UPLOAD_EXTENSIONS = [
  "flac",
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "m4a",
  "ogg",
  "wav",
  "webm",
];

export const MODEL_OPTIONS: { value: GroqModel; label: string }[] = [
  { value: "whisper-large-v3", label: "Whisper Large v3 (most accurate)" },
  { value: "whisper-large-v3-turbo", label: "Whisper Large v3 Turbo (fastest)" },
];

export const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "tr", label: "Turkish" },
  { value: "nl", label: "Dutch" },
  { value: "ru", label: "Russian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "hi", label: "Hindi" },
];

/** Max tokens Groq accepts for the custom-vocabulary `prompt` field. We only warn client-side. */
export const VOCAB_MAX_TOKENS = 224;

export const APP_SETTINGS_DIR_NAME = "GroqCaptions";

// --- Phase 2: sync/grouping/style defaults --------------------------------------------------

/** Caption vertical position as a fraction of comp height (0 = top). Index matches
 * CaptionPositionIndex / POSITION_OPTIONS below. */
export const POSITION_Y_FRACTIONS = [0.82, 0.7, 0.5, 0.16] as const;

export const POSITION_OPTIONS: { label: string }[] = [
  { label: "Bottom" },
  { label: "Lower third" },
  { label: "Center" },
  { label: "Top" },
];

export const DEFAULT_SYNC_OPTIONS = {
  offsetFrames: 0,
  leadInFrames: 0,
  onsetWindowSeconds: 0.15,
  onsetThresholdRatio: 0.25,
};

export const DEFAULT_GROUPING_OPTIONS = {
  maxWords: 3,
  maxCharsPerLine: 20,
  maxLines: 2,
  pauseBreakSeconds: 0.45,
  holdSeconds: 0.35,
  flickerGapSeconds: 0.6,
  uppercase: true,
};

export const DEFAULT_CAPTION_STYLE = {
  font: "Arial-BoldMT",
  size: 90,
  textColor: 0xffffff,
  highlightColor: 0xffd400,
  strokeColor: 0x000000,
  strokeWidth: 8,
  posIndex: 0 as const,
  reveal: true,
  highlight: true,
  pop: true,
  shadow: false,
};

/** Chunking: only kicks in once a single extraction would exceed the Groq upload ceiling.
 * 10 minutes of 16kHz mono FLAC comfortably clears 24.5MB with room to spare; 30s of overlap
 * gives Whisper enough shared context on both sides of a cut for onset/word continuity. */
export const CHUNK_MAX_SECONDS = 600;
export const CHUNK_OVERLAP_SECONDS = 30;
