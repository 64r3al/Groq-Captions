import { useState } from "react";
import { evalTS } from "../../lib/utils/bolt";
import { findFfmpeg } from "../../lib/services/ffmpeg";
import { refineOnsets } from "../../lib/services/onset";
import { syncWords } from "../../../shared/sync";
import { buildGroups } from "../../../shared/captions";
import {
  DEFAULT_CAPTION_STYLE,
  DEFAULT_GROUPING_OPTIONS,
  DEFAULT_SYNC_OPTIONS,
  POSITION_OPTIONS,
} from "../../../shared/constants";
import type {
  BuildCaptionsResult,
  CaptionPositionIndex,
  SelectedAudioLayerInfo,
  TranscriptWord,
} from "../../../shared/types";

const hexToInt = (hex: string): number => parseInt(hex.replace("#", ""), 16);
const intToHex = (n: number): string => `#${n.toString(16).padStart(6, "0")}`;

export const CaptionBuilder = ({
  selection,
  words,
  audioPath,
}: {
  selection: SelectedAudioLayerInfo;
  words: TranscriptWord[];
  /** The audio actually sent to Groq for this transcript, if a single file (not chunked) -
   * used for onset refinement. Null when the audio was split into chunks (see TranscribeTab). */
  audioPath: string | null;
}) => {
  const [offsetFrames, setOffsetFrames] = useState(DEFAULT_SYNC_OPTIONS.offsetFrames);
  const [leadInFrames, setLeadInFrames] = useState(DEFAULT_SYNC_OPTIONS.leadInFrames);
  const [onsetRefinement, setOnsetRefinement] = useState(true);

  const [maxWords, setMaxWords] = useState(DEFAULT_GROUPING_OPTIONS.maxWords);
  const [maxCharsPerLine, setMaxCharsPerLine] = useState(DEFAULT_GROUPING_OPTIONS.maxCharsPerLine);
  const [uppercase, setUppercase] = useState(DEFAULT_GROUPING_OPTIONS.uppercase);

  const [font, setFont] = useState(DEFAULT_CAPTION_STYLE.font);
  const [size, setSize] = useState(DEFAULT_CAPTION_STYLE.size);
  const [textColor, setTextColor] = useState(DEFAULT_CAPTION_STYLE.textColor);
  const [highlightColor, setHighlightColor] = useState(DEFAULT_CAPTION_STYLE.highlightColor);
  const [strokeColor, setStrokeColor] = useState(DEFAULT_CAPTION_STYLE.strokeColor);
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_CAPTION_STYLE.strokeWidth);
  const [posIndex, setPosIndex] = useState<CaptionPositionIndex>(DEFAULT_CAPTION_STYLE.posIndex);
  const [reveal, setReveal] = useState(DEFAULT_CAPTION_STYLE.reveal);
  const [highlight, setHighlight] = useState(DEFAULT_CAPTION_STYLE.highlight);
  const [pop, setPop] = useState(DEFAULT_CAPTION_STYLE.pop);
  const [shadow, setShadow] = useState(DEFAULT_CAPTION_STYLE.shadow);

  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<BuildCaptionsResult | null>(null);

  const handleBuild = async () => {
    setBusy(true);
    setErrorMessage(null);
    setStatusText("");
    try {
      let sourceWords = words;

      if (onsetRefinement && audioPath) {
        const ffmpegPath = findFfmpeg();
        if (ffmpegPath) {
          setStatusText("Refining word timing against the audio…");
          sourceWords = await refineOnsets(ffmpegPath, audioPath, words, {
            windowSeconds: DEFAULT_SYNC_OPTIONS.onsetWindowSeconds,
            thresholdRatio: DEFAULT_SYNC_OPTIONS.onsetThresholdRatio,
          });
        }
      }

      const synced = syncWords(
        sourceWords,
        {
          mapping: {
            startTime: selection.startTime,
            sourceOffset: selection.sourceInSeconds,
            stretchPercent: selection.stretchPercent,
          },
          inPoint: selection.inPoint,
          outPoint: selection.outPoint,
        },
        { fps: selection.compFrameRate, offsetFrames }
      );
      const groups = buildGroups(synced, {
        maxWords,
        maxCharsPerLine,
        maxLines: 2,
        pauseBreakSeconds: DEFAULT_GROUPING_OPTIONS.pauseBreakSeconds,
        holdSeconds: DEFAULT_GROUPING_OPTIONS.holdSeconds,
        flickerGapSeconds: DEFAULT_GROUPING_OPTIONS.flickerGapSeconds,
        fps: selection.compFrameRate,
        compDuration: selection.compDuration,
        uppercase,
      });

      if (!groups.length) {
        throw new Error("No words to build captions from.");
      }

      setStatusText("Building captions in After Effects…");
      const built = await evalTS("buildCaptions", selection.compId, groups, {
        font,
        size,
        textColor,
        highlightColor,
        strokeColor,
        strokeWidth,
        posIndex,
        reveal,
        highlight,
        pop,
        shadow,
        leadInFrames,
      });

      setResult(built);
      setStatusText(
        `${result ? "Rebuilt" : "Built"}: ${built.captions} captions, ${built.words} words, in "${built.precompName}".`
      );
    } catch (err: any) {
      setErrorMessage(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="field-group">
      <h3>Captions</h3>

      <div className="row">
        <label className="field small">
          <span>Offset (frames)</span>
          <input
            type="number"
            value={offsetFrames}
            onChange={(e) => setOffsetFrames(Number(e.target.value) || 0)}
          />
        </label>
        <label className="field small">
          <span>Lead-in (frames)</span>
          <input
            type="number"
            min={0}
            value={leadInFrames}
            onChange={(e) => setLeadInFrames(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
      </div>
      <label className="row checkbox-row">
        <input
          type="checkbox"
          checked={onsetRefinement}
          disabled={!audioPath}
          onChange={(e) => setOnsetRefinement(e.target.checked)}
        />
        <span>
          Refine word timing against the audio{!audioPath ? " (unavailable for this transcript)" : ""}
        </span>
      </label>

      <div className="row">
        <label className="field small">
          <span>Words / caption</span>
          <input
            type="number"
            min={1}
            value={maxWords}
            onChange={(e) => setMaxWords(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
        <label className="field small">
          <span>Chars / line</span>
          <input
            type="number"
            min={6}
            value={maxCharsPerLine}
            onChange={(e) => setMaxCharsPerLine(Math.max(6, Number(e.target.value) || 6))}
          />
        </label>
      </div>
      <label className="row checkbox-row">
        <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} />
        <span>UPPERCASE</span>
      </label>

      <div className="row">
        <label className="field small">
          <span>Font (PostScript name)</span>
          <input type="text" value={font} onChange={(e) => setFont(e.target.value)} />
        </label>
        <label className="field small">
          <span>Size</span>
          <input
            type="number"
            min={4}
            value={size}
            onChange={(e) => setSize(Math.max(4, Number(e.target.value) || 4))}
          />
        </label>
      </div>
      <div className="row">
        <label className="field small">
          <span>Text color</span>
          <input type="color" value={intToHex(textColor)} onChange={(e) => setTextColor(hexToInt(e.target.value))} />
        </label>
        <label className="field small">
          <span>Active word</span>
          <input
            type="color"
            value={intToHex(highlightColor)}
            onChange={(e) => setHighlightColor(hexToInt(e.target.value))}
          />
        </label>
        <label className="field small">
          <span>Stroke</span>
          <input
            type="color"
            value={intToHex(strokeColor)}
            onChange={(e) => setStrokeColor(hexToInt(e.target.value))}
          />
        </label>
      </div>
      <div className="row">
        <label className="field small">
          <span>Stroke width</span>
          <input
            type="number"
            min={0}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <label className="field small">
          <span>Position</span>
          <select value={posIndex} onChange={(e) => setPosIndex(Number(e.target.value) as CaptionPositionIndex)}>
            {POSITION_OPTIONS.map((opt, i) => (
              <option key={opt.label} value={i}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="row button-row">
        <label className="checkbox-row">
          <input type="checkbox" checked={reveal} onChange={(e) => setReveal(e.target.checked)} />
          <span>Word-by-word</span>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} />
          <span>Highlight active</span>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={pop} onChange={(e) => setPop(e.target.checked)} />
          <span>Pop in</span>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={shadow} onChange={(e) => setShadow(e.target.checked)} />
          <span>Drop shadow</span>
        </label>
      </div>

      <div className="row button-row">
        <button onClick={handleBuild} disabled={busy}>
          {busy ? "Working…" : result ? "Rebuild Captions" : "Build Captions"}
        </button>
      </div>

      {statusText && !errorMessage && <p className="hint">{statusText}</p>}
      {errorMessage && <p className="status-error">{errorMessage}</p>}
      {result && !busy && !errorMessage && (
        <p className="hint small">
          Rebuilding creates a new "{result.precompName}" precomp each time — delete the old one if you
          don't need it.
        </p>
      )}
    </section>
  );
};
