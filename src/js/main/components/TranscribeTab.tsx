import { useEffect, useRef, useState } from "react";
import { evalTS } from "../../lib/utils/bolt";
import { resolveApiKey } from "../../lib/services/apiKey";
import {
  extractAudio,
  findFfmpeg,
  getFileSizeBytes,
  removeTempFile,
  type ExtractAudioHandle,
} from "../../lib/services/ffmpeg";
import { transcribe, type TranscribeHandle } from "../../lib/services/groq";
import {
  DIRECT_UPLOAD_EXTENSIONS,
  LANGUAGE_OPTIONS,
  MAX_UPLOAD_BYTES,
  MODEL_OPTIONS,
  VOCAB_MAX_TOKENS,
} from "../../../shared/constants";
import type { GroqModel, SelectedAudioLayerInfo, TranscriptResult } from "../../../shared/types";

type Stage = "idle" | "extracting" | "transcribing" | "done" | "error";

const fmtBytes = (n: number) => `${(n / (1024 * 1024)).toFixed(1)} MB`;
const fmtSeconds = (n: number) => `${n.toFixed(1)}s`;
const fmtTimestamp = (n: number) => {
  const m = Math.floor(n / 60);
  const s = (n % 60).toFixed(2);
  return `${m}:${s.padStart(5, "0")}`;
};

export const TranscribeTab = ({ onNeedApiKey }: { onNeedApiKey: () => void }) => {
  const [selection, setSelection] = useState<SelectedAudioLayerInfo | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [loadingSelection, setLoadingSelection] = useState(false);

  const [model, setModel] = useState<GroqModel>(MODEL_OPTIONS[0].value);
  const [language, setLanguage] = useState("");
  const [vocab, setVocab] = useState("");

  const [stage, setStage] = useState<Stage>("idle");
  const [statusText, setStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptResult | null>(null);

  const activeHandle = useRef<ExtractAudioHandle | TranscribeHandle | null>(null);
  const tempAudioPath = useRef<string | null>(null);
  const cancelledRef = useRef(false);

  const refreshSelection = async () => {
    setLoadingSelection(true);
    setSelectionError(null);
    try {
      const info = await evalTS("getSelectedAudioLayerInfo");
      setSelection(info);
    } catch (err: any) {
      setSelection(null);
      setSelectionError(err?.message || String(err));
    } finally {
      setLoadingSelection(false);
    }
  };

  useEffect(() => {
    refreshSelection();
  }, []);

  const handleCancel = () => {
    cancelledRef.current = true;
    activeHandle.current?.cancel();
    activeHandle.current = null;
    setStage("idle");
    setStatusText("Cancelled.");
    if (tempAudioPath.current) {
      removeTempFile(tempAudioPath.current);
      tempAudioPath.current = null;
    }
  };

  const handleGenerate = async () => {
    cancelledRef.current = false;
    setErrorMessage(null);
    setTranscript(null);

    let info: SelectedAudioLayerInfo;
    try {
      info = await evalTS("getSelectedAudioLayerInfo");
      setSelection(info);
      setSelectionError(null);
    } catch (err: any) {
      setSelection(null);
      setSelectionError(err?.message || String(err));
      return;
    }

    const { key: apiKey } = resolveApiKey();
    if (!apiKey) {
      setErrorMessage("Add your Groq API key in Settings first.");
      onNeedApiKey();
      return;
    }

    if (vocab.trim().split(/\s+/).filter(Boolean).length > VOCAB_MAX_TOKENS) {
      setErrorMessage(`Vocabulary prompt is too long (max ~${VOCAB_MAX_TOKENS} tokens).`);
      return;
    }

    let audioPath: string;
    let isTemp = false;
    const ffmpegPath = findFfmpeg();

    try {
      if (ffmpegPath) {
        setStage("extracting");
        setStatusText("Extracting audio with ffmpeg…");
        const handle = extractAudio(
          ffmpegPath,
          info.sourceFilePath,
          info.sourceInSeconds,
          info.sourceDurationSeconds
        );
        activeHandle.current = handle;
        tempAudioPath.current = handle.outPath;
        audioPath = await handle.promise;
        isTemp = true;
        if (cancelledRef.current) throw new Error("Cancelled.");
      } else {
        const ext = info.sourceFileName.split(".").pop()?.toLowerCase() || "";
        const eligible =
          DIRECT_UPLOAD_EXTENSIONS.includes(ext) && info.sourceFileSizeBytes <= MAX_UPLOAD_BYTES;
        if (!eligible) {
          throw new Error(
            "ffmpeg was not found, and this file can't be sent directly " +
              (DIRECT_UPLOAD_EXTENSIONS.includes(ext)
                ? "(it is larger than 25 MB)."
                : `(.${ext} is not a format Groq accepts directly).`) +
              "\n\nInstall ffmpeg (Windows: winget install ffmpeg / macOS: brew install ffmpeg) " +
              "or locate it from the Settings tab."
          );
        }
        audioPath = info.sourceFilePath;
      }

      if (getFileSizeBytes(audioPath) > MAX_UPLOAD_BYTES) {
        throw new Error("Audio is larger than 25 MB (about 20+ minutes). Trim the layer and try again.");
      }

      setStage("transcribing");
      setStatusText(`Transcribing with Groq (${model})…`);
      const handle = transcribe(audioPath, {
        apiKey,
        model,
        language: language || undefined,
        prompt: vocab.trim() || undefined,
      });
      activeHandle.current = handle;
      const result = await handle.promise;

      setTranscript(result);
      setStage("done");
      setStatusText(`Done: ${result.words.length} words.`);
    } catch (err: any) {
      if (!cancelledRef.current) {
        setStage("error");
        setErrorMessage(err?.message || String(err));
      }
    } finally {
      activeHandle.current = null;
      // isTemp is only true once ffmpeg actually produced a file; on an extraction failure
      // ffmpeg.ts already cleaned up its own partial output, so this just clears the stale ref.
      if (isTemp && tempAudioPath.current) {
        removeTempFile(tempAudioPath.current);
      }
      tempAudioPath.current = null;
    }
  };

  const busy = stage === "extracting" || stage === "transcribing";

  return (
    <div className="pane">
      <section className="field-group">
        <div className="row space-between">
          <h3>Selection</h3>
          <button className="secondary small" onClick={refreshSelection} disabled={loadingSelection}>
            {loadingSelection ? "Checking…" : "Refresh"}
          </button>
        </div>
        {selection ? (
          <p className="hint">
            <strong>{selection.layerName}</strong> in {selection.compName} —{" "}
            {fmtSeconds(selection.sourceDurationSeconds)} of audio (
            {fmtBytes(selection.sourceFileSizeBytes)} source file)
          </p>
        ) : (
          <p className="hint status-error">{selectionError || "Select a voice layer in After Effects."}</p>
        )}
      </section>

      <section className="field-group">
        <h3>Transcription</h3>
        <label className="field">
          <span>Model</span>
          <select value={model} onChange={(e) => setModel(e.target.value as GroqModel)}>
            {MODEL_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Language</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGE_OPTIONS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Vocabulary</span>
          <input
            type="text"
            placeholder="Names, brands, slang to spell correctly"
            value={vocab}
            onChange={(e) => setVocab(e.target.value)}
          />
        </label>
      </section>

      <div className="row button-row">
        <button onClick={handleGenerate} disabled={busy || !selection}>
          {busy ? "Working…" : "Generate Transcript"}
        </button>
        {busy && (
          <button className="secondary" onClick={handleCancel}>
            Cancel
          </button>
        )}
      </div>

      {statusText && stage !== "error" && <p className="hint">{statusText}</p>}
      {errorMessage && <p className="status-error">{errorMessage}</p>}

      {transcript && (
        <section className="field-group">
          <h3>Transcript</h3>
          <p className="hint">
            {transcript.words.length} words
            {transcript.language ? ` · detected language: ${transcript.language}` : ""}
          </p>
          <div className="transcript-text">{transcript.text}</div>
          <div className="word-table">
            <div className="word-table-header">
              <span>Start</span>
              <span>End</span>
              <span>Word</span>
            </div>
            <div className="word-table-body">
              {transcript.words.map((w, i) => (
                <div className="word-row" key={i}>
                  <span>{fmtTimestamp(w.start)}</span>
                  <span>{fmtTimestamp(w.end)}</span>
                  <span>{w.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
