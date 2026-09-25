import { child_process, fs, os, path } from "../cep/node";
import { assertNodeAvailable } from "./env";
import { computeRmsEnvelope, refineWordStarts } from "../../../shared/onset";
import type { TranscriptWord } from "../../../shared/types";

const HOP_SECONDS = 0.01;
const SAMPLE_RATE = 16000;

/** Decodes audioPath (already 16kHz mono, since it's the same file sent to Groq) to raw
 * signed 16-bit little-endian PCM. Runs as a background child process, same as extractAudio —
 * never blocks the panel's UI thread. */
const decodePcm16Mono = (ffmpegPath: string, audioPath: string): Promise<Buffer> => {
  assertNodeAvailable();
  const outPath = path.join(
    os.tmpdir(),
    `groqcap_pcm_${Date.now()}_${Math.round(Math.random() * 1e6)}.pcm`
  );
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      audioPath,
      "-f",
      "s16le",
      "-acodec",
      "pcm_s16le",
      "-ar",
      String(SAMPLE_RATE),
      "-ac",
      "1",
      outPath,
    ];
    child_process.execFile(
      ffmpegPath,
      args,
      { maxBuffer: 1024 * 1024 * 20 },
      async (err: Error | null, _stdout: string, stderr: string) => {
        if (err) {
          try {
            if (fs.existsSync(outPath)) await fs.promises.unlink(outPath);
          } catch {
            // best-effort cleanup only
          }
          reject(new Error(`ffmpeg could not decode audio for onset detection.\n${stderr || err.message}`));
          return;
        }
        try {
          const buf = await fs.promises.readFile(outPath);
          await fs.promises.unlink(outPath).catch(() => {});
          resolve(buf);
        } catch (readErr) {
          reject(readErr as Error);
        }
      }
    );
  });
};

const pcm16BufferToFloatSamples = (buf: Buffer): Float32Array => {
  const sampleCount = Math.floor(buf.length / 2);
  const out = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    out[i] = buf.readInt16LE(i * 2) / 32768;
  }
  return out;
};

export interface RefineOnsetsOptions {
  /** Search window around each Whisper-reported word start, in seconds. Default 0.15 (the
   * brief's "+/-150ms"). */
  windowSeconds?: number;
  /** Rising-edge threshold as a fraction of the local peak RMS. Default 0.25. */
  thresholdRatio?: number;
}

/** Refines word start times against the actual audio's energy envelope (see
 * src/shared/onset.ts for the detection math). Best-effort: if ffmpeg can't decode the audio
 * for any reason, this logs nothing sensitive and just returns the original words unchanged
 * rather than failing the whole caption-generation flow over a refinement nicety. */
export const refineOnsets = async (
  ffmpegPath: string,
  audioPath: string,
  words: TranscriptWord[],
  options: RefineOnsetsOptions = {}
): Promise<TranscriptWord[]> => {
  assertNodeAvailable();
  if (!words.length) return words;

  let pcm: Buffer;
  try {
    pcm = await decodePcm16Mono(ffmpegPath, audioPath);
  } catch {
    return words;
  }

  const envelope = computeRmsEnvelope(pcm16BufferToFloatSamples(pcm), SAMPLE_RATE, HOP_SECONDS);
  return refineWordStarts(words, envelope, HOP_SECONDS, {
    windowSeconds: options.windowSeconds ?? 0.15,
    thresholdRatio: options.thresholdRatio ?? 0.25,
  });
};
