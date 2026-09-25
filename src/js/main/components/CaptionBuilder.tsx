import { useState } from "react";
import { Wand2 } from "lucide-react";
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
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Toggle } from "../ui/Toggle";
import { NumberScrubber } from "../ui/NumberScrubber";
import { ColorSwatch } from "../ui/ColorSwatch";
import { InlineError } from "../ui/InlineError";
import { CollapsibleSection } from "../ui/SectionHeader";
import { CaptionPreviewCanvas } from "../features/CaptionPreviewCanvas";
import { PresetGallery } from "../features/PresetGallery";

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

  const [styleOpen, setStyleOpen] = useState(true);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<BuildCaptionsResult | null>(null);

  // Live style object for the preview canvas and the preset gallery - purely UI-layer, reads
  // the same state this component already builds captions from, sets nothing new.
  const currentStyle = {
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
  };

  const applyPreset = (preset: typeof currentStyle) => {
    setFont(preset.font);
    setSize(preset.size);
    setTextColor(preset.textColor);
    setHighlightColor(preset.highlightColor);
    setStrokeColor(preset.strokeColor);
    setStrokeWidth(preset.strokeWidth);
    setPosIndex(preset.posIndex);
    setReveal(preset.reveal);
    setHighlight(preset.highlight);
    setPop(preset.pop);
    setShadow(preset.shadow);
  };

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
    <CollapsibleSection
      title="Style"
      subtitle={POSITION_OPTIONS[posIndex]?.label}
      open={styleOpen}
      onToggle={() => setStyleOpen((o) => !o)}
    >
      <CaptionPreviewCanvas style={currentStyle} />

      <PresetGallery
        activeId={activePresetId}
        onApply={(preset) => {
          applyPreset(preset);
          setActivePresetId(null);
        }}
      />

      <div className="gc-field-row">
        <NumberScrubber label="Offset" value={offsetFrames} onChange={setOffsetFrames} suffix="fr" />
        <NumberScrubber label="Lead-in" value={leadInFrames} onChange={setLeadInFrames} min={0} suffix="fr" />
      </div>
      <Toggle
        checked={onsetRefinement}
        onChange={setOnsetRefinement}
        disabled={!audioPath}
        label={`Refine word timing against the audio${!audioPath ? " (unavailable for this transcript)" : ""}`}
      />

      <div className="gc-field-row">
        <NumberScrubber label="Words / caption" value={maxWords} onChange={setMaxWords} min={1} />
        <NumberScrubber label="Chars / line" value={maxCharsPerLine} onChange={setMaxCharsPerLine} min={6} />
      </div>
      <Toggle checked={uppercase} onChange={setUppercase} label="UPPERCASE" />

      <div className="gc-field-row">
        <Input label="Font (PostScript name)" value={font} onChange={(e) => setFont(e.target.value)} />
        <NumberScrubber label="Size" value={size} onChange={setSize} min={4} />
      </div>
      <div className="gc-field-row">
        <ColorSwatch label="Text" value={textColor} onChange={setTextColor} />
        <ColorSwatch label="Active word" value={highlightColor} onChange={setHighlightColor} />
        <ColorSwatch label="Stroke" value={strokeColor} onChange={setStrokeColor} />
      </div>
      <div className="gc-field-row">
        <NumberScrubber label="Stroke width" value={strokeWidth} onChange={setStrokeWidth} min={0} />
        <Select
          label="Position"
          value={String(posIndex)}
          onChange={(e) => setPosIndex(Number(e.target.value) as CaptionPositionIndex)}
          options={POSITION_OPTIONS.map((opt, i) => ({ value: String(i), label: opt.label }))}
        />
      </div>

      <div className="gc-toggle-row">
        <Toggle checked={reveal} onChange={setReveal} label="Word-by-word" />
        <Toggle checked={highlight} onChange={setHighlight} label="Highlight active" />
        <Toggle checked={pop} onChange={setPop} label="Pop in" />
        <Toggle checked={shadow} onChange={setShadow} label="Drop shadow" />
      </div>

      {errorMessage && <InlineError message={errorMessage} />}

      <div className="gc-sticky-bar">
        <Button variant="primary" icon={<Wand2 size={14} />} onClick={handleBuild} loading={busy}>
          {result ? "Rebuild Captions" : "Build Captions"}
        </Button>
        {!busy && statusText && !errorMessage && <span className="gc-hint">{statusText}</span>}
      </div>
      {result && !busy && !errorMessage && (
        <p className="gc-hint">
          Rebuilding creates a new "{result.precompName}" precomp each time — delete the old one if you
          don't need it.
        </p>
      )}
    </CollapsibleSection>
  );
};
