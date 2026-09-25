import { useEffect, useRef, useState } from "react";
import { RefreshCw, FileAudio } from "lucide-react";
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
import { planChunks, stitchTranscriptChunks, type TranscribedChunk } from "../../../shared/chunking";
import { CaptionBuilder } from "./CaptionBuilder";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { InlineError } from "../ui/InlineError";
import { EmptyState } from "../ui/EmptyState";
import { CollapsibleSection, SectionHeader } from "../ui/SectionHeader";
import { Card } from "../ui/Card";
import { StagedProgress } from "../ui/Progress";
import { WaveformPreview } from "../features/WaveformPreview";
import { TranscriptEditor } from "../features/TranscriptEditor";
import {
  CHUNK_MAX_SECONDS,
  CHUNK_OVERLAP_SECONDS,
  DIRECT_UPLOAD_EXTENSIONS,
  LANGUAGE_OPTIONS,
  MAX_UPLOAD_BYTES,
  MODEL_OPTIONS,
  VOCAB_MAX_TOKENS,
} from "../../../shared/constants";
import type { GroqModel, SelectedAudioLayerInfo, TranscriptResult } from "../../../shared/types";

type Stage = "idle" | "extracting" | "transcribing" | "done" | "error";

const STAGE_STEPS = [
  { key: "extracting", label: "Extracting" },
  { key: "transcribing", label: "Transcribing" },
];

const fmtBytes = (n: number) => `${(n / (1024 * 1024)).toFixed(1)} MB`;
const fmtSeconds = (n: number) => `${n.toFixed(1)}s`;

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
  // The single audio file this transcript came from, if any (not chunked) - used for onset
  // refinement in CaptionBuilder. Kept alive (not deleted) once a transcript succeeds; cleaned
  // up when a new generation starts or this tab unmounts.
  const [transcriptAudioPath, setTranscriptAudioPath] = useState<string | null>(null);

  const [transcribeOpen, setTranscribeOpen] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(true);

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

  // Best-effort cleanup if the user switches tabs (or closes the panel) while a completed
  // transcript's temp audio is still cached for onset refinement.
  useEffect(() => {
    return () => {
      if (tempAudioPath.current) removeTempFile(tempAudioPath.current);
    };
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
    setTranscriptAudioPath(null);
    if (tempAudioPath.current) {
      removeTempFile(tempAudioPath.current);
      tempAudioPath.current = null;
    }

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

    // resolveApiKey()/findFfmpeg() read from the filesystem via Node integration, which isn't
    // present in the plain-browser `npm run dev` server (see lib/services/env.ts) - catch that
    // here so it surfaces as the same on-screen error every other failure below gets, instead
    // of an unhandled rejection that leaves the button looking like it did nothing.
    let apiKey: string | null;
    try {
      apiKey = resolveApiKey().key;
    } catch (err: any) {
      setErrorMessage(err?.message || String(err));
      return;
    }
    if (!apiKey) {
      setErrorMessage("Add your Groq API key in Settings first.");
      onNeedApiKey();
      return;
    }

    const vocabTokenCount = vocab.trim().split(/\s+/).filter(Boolean).length;
    if (vocabTokenCount > VOCAB_MAX_TOKENS) {
      setErrorMessage(`Vocabulary prompt is too long (max ~${VOCAB_MAX_TOKENS} tokens).`);
      return;
    }

    let ffmpegPath: string | null;
    try {
      ffmpegPath = findFfmpeg();
    } catch (err: any) {
      setErrorMessage(err?.message || String(err));
      return;
    }
    const transcribeOpts = {
      apiKey,
      model,
      language: language || undefined,
      prompt: vocab.trim() || undefined,
    };

    try {
      if (ffmpegPath && info.sourceDurationSeconds > CHUNK_MAX_SECONDS) {
        // Long audio: split into overlapping chunks, transcribe each in turn, stitch the
        // results. No single file represents the whole clip, so onset refinement isn't
        // offered for this transcript (see CaptionBuilder's audioPath prop).
        const plan = planChunks(info.sourceDurationSeconds, CHUNK_MAX_SECONDS, CHUNK_OVERLAP_SECONDS);
        const chunkResults: TranscribedChunk[] = [];

        for (let i = 0; i < plan.length; i++) {
          if (cancelledRef.current) throw new Error("Cancelled.");
          setStage("extracting");
          setStatusText(`Extracting chunk ${i + 1} of ${plan.length}…`);
          const extractHandle = extractAudio(
            ffmpegPath,
            info.sourceFilePath,
            info.sourceInSeconds + plan[i].start,
            plan[i].duration
          );
          activeHandle.current = extractHandle;
          tempAudioPath.current = extractHandle.outPath;
          const chunkAudioPath = await extractHandle.promise;
          if (cancelledRef.current) throw new Error("Cancelled.");

          setStage("transcribing");
          setStatusText(`Transcribing chunk ${i + 1} of ${plan.length} with Groq (${model})…`);
          const transcribeHandle = transcribe(chunkAudioPath, transcribeOpts);
          activeHandle.current = transcribeHandle;
          const chunkResult = await transcribeHandle.promise;
          removeTempFile(chunkAudioPath);
          tempAudioPath.current = null;
          if (cancelledRef.current) throw new Error("Cancelled.");

          chunkResults.push({ words: chunkResult.words, offsetSeconds: plan[i].start });
        }

        const stitchedWords = stitchTranscriptChunks(chunkResults, CHUNK_OVERLAP_SECONDS);
        setTranscript({ text: stitchedWords.map((w) => w.text).join(" "), words: stitchedWords, segments: [] });
        setTranscriptAudioPath(null);
        setStage("done");
        setStatusText(`Done: ${stitchedWords.length} words across ${plan.length} chunks.`);
      } else {
        let audioPath: string;
        let isTemp = false;

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
          throw new Error(
            "Audio is larger than 25 MB. Install ffmpeg so it can be split into chunks " +
              "automatically, or trim the layer and try again."
          );
        }

        setStage("transcribing");
        setStatusText(`Transcribing with Groq (${model})…`);
        const handle = transcribe(audioPath, transcribeOpts);
        activeHandle.current = handle;
        const result = await handle.promise;
        if (cancelledRef.current) throw new Error("Cancelled.");

        setTranscript(result);
        setTranscriptAudioPath(audioPath);
        if (!isTemp) tempAudioPath.current = null; // direct upload: nothing of ours to clean up
        setStage("done");
        setStatusText(`Done: ${result.words.length} words.`);
      }
    } catch (err: any) {
      if (!cancelledRef.current) {
        setStage("error");
        setErrorMessage(err?.message || String(err));
      }
      if (tempAudioPath.current) {
        removeTempFile(tempAudioPath.current);
        tempAudioPath.current = null;
      }
    } finally {
      activeHandle.current = null;
    }
  };

  const busy = stage === "extracting" || stage === "transcribing";

  return (
    <div className="gc-pane">
      <Card className="gc-source-card">
        <SectionHeader
          title="Source"
          action={
            <Button size="sm" variant="ghost" icon={<RefreshCw size={14} />} onClick={refreshSelection} loading={loadingSelection}>
              Refresh
            </Button>
          }
        />
        {selection ? (
          <>
            <WaveformPreview seed={selection.sourceFileName} />
            <p className="gc-source-meta">
              <strong>{selection.layerName}</strong> in {selection.compName} — {fmtSeconds(selection.sourceDurationSeconds)} of
              audio ({fmtBytes(selection.sourceFileSizeBytes)} source file)
            </p>
          </>
        ) : (
          <EmptyState
            icon={<FileAudio size={22} />}
            title="No audio layer selected"
            description={selectionError || "Select a layer with audio in After Effects, then refresh."}
            action={
              <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={refreshSelection}>
                Refresh
              </Button>
            }
          />
        )}
      </Card>

      <CollapsibleSection
        title="Transcribe"
        subtitle={`${MODEL_OPTIONS.find((m) => m.value === model)?.label || model}`}
        open={transcribeOpen}
        onToggle={() => setTranscribeOpen((o) => !o)}
      >
        <Select
          label="Model"
          value={model}
          onChange={(e) => setModel(e.target.value as GroqModel)}
          options={MODEL_OPTIONS.map((m) => ({ value: m.value, label: m.label }))}
        />
        <Select
          label="Language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          options={LANGUAGE_OPTIONS.map((l) => ({ value: l.value, label: l.label }))}
        />
        <Input
          label="Vocabulary"
          placeholder="Names, brands, slang to spell correctly"
          value={vocab}
          onChange={(e) => setVocab(e.target.value)}
        />

        {errorMessage && <InlineError message={errorMessage} />}

        <div className="gc-sticky-bar">
          <Button variant="primary" onClick={handleGenerate} disabled={busy || !selection} loading={busy}>
            Generate Transcript
          </Button>
          {busy && (
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
          )}
          {busy && <StagedProgress steps={STAGE_STEPS} activeKey={stage} />}
          {!busy && statusText && stage !== "error" && <span className="gc-hint">{statusText}</span>}
        </div>
      </CollapsibleSection>

      {transcript && (
        <CollapsibleSection
          title="Transcript"
          subtitle={`${transcript.words.length} words${transcript.language ? ` · ${transcript.language}` : ""}`}
          open={transcriptOpen}
          onToggle={() => setTranscriptOpen((o) => !o)}
        >
          <TranscriptEditor words={transcript.words} />
        </CollapsibleSection>
      )}

      {transcript && selection && (
        <CaptionBuilder selection={selection} words={transcript.words} audioPath={transcriptAudioPath} />
      )}
    </div>
  );
};
