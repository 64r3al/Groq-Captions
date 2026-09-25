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
