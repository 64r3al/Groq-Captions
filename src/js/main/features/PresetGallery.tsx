import { intToHex } from "../ui/color";
import type { CaptionStyle } from "../../../shared/types";

export type StylePreset = {
  id: string;
  name: string;
  style: Omit<CaptionStyle, "leadInFrames">;
};

export const CAPTION_STYLE_PRESETS: StylePreset[] = [
  {
    id: "bold-bottom",
    name: "Bold Bottom",
    style: {
      font: "Arial-BoldMT",
      size: 90,
      textColor: 0xffffff,
      highlightColor: 0xffd400,
      strokeColor: 0x000000,
      strokeWidth: 8,
      posIndex: 0,
      reveal: true,
      highlight: true,
      pop: true,
      shadow: false,
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    style: {
      font: "Helvetica-Bold",
      size: 64,
      textColor: 0xffffff,
      highlightColor: 0xffffff,
      strokeColor: 0x000000,
      strokeWidth: 0,
      posIndex: 3,
      reveal: true,
      highlight: false,
      pop: false,
      shadow: true,
    },
  },
  {
    id: "neon-pop",
    name: "Neon Pop",
    style: {
      font: "Arial-BoldMT",
      size: 100,
      textColor: 0xffffff,
      highlightColor: 0x39ff88,
      strokeColor: 0x111111,
      strokeWidth: 6,
      posIndex: 1,
      reveal: true,
      highlight: true,
      pop: true,
      shadow: false,
    },
  },
  {
    id: "classic-subtitle",
    name: "Classic Subtitle",
    style: {
      font: "Arial",
      size: 54,
      textColor: 0xffffff,
      highlightColor: 0xffffff,
      strokeColor: 0x000000,
      strokeWidth: 4,
      posIndex: 0,
      reveal: false,
      highlight: false,
      pop: false,
      shadow: false,
    },
  },
  {
    id: "creator-hype",
    name: "Creator Hype",
    style: {
      font: "Arial-BoldMT",
      size: 110,
      textColor: 0xffee00,
      highlightColor: 0xff3b30,
      strokeColor: 0x000000,
      strokeWidth: 10,
      posIndex: 2,
      reveal: true,
      highlight: true,
      pop: true,
      shadow: true,
    },
  },
];

export interface PresetGalleryProps {
  onApply: (style: Omit<CaptionStyle, "leadInFrames">) => void;
  activeId?: string | null;
}

/** Built-in static style presets (per the redesign brief: no user-saved presets in this pass).
 * Each card shows a cheap, non-animated text swatch rather than a full CaptionPreviewCanvas -
 * five live-animated previews running at once would be exactly the re-render/timer storm the
 * brief's performance section warns against, for a gallery where a static look-and-feel hint
 * is all that's needed to pick one. */
export const PresetGallery = ({ onApply, activeId }: PresetGalleryProps) => (
  <div className="gc-preset-gallery">
    {CAPTION_STYLE_PRESETS.map((preset) => (
      <button
        key={preset.id}
        type="button"
        className={`gc-preset-card${activeId === preset.id ? " gc-preset-card--active" : ""}`}
        onClick={() => onApply(preset.style)}
      >
        <span
          className="gc-preset-swatch"
          style={{
            color: intToHex(preset.style.highlight ? preset.style.highlightColor : preset.style.textColor),
            WebkitTextStroke: preset.style.strokeWidth ? `1px ${intToHex(preset.style.strokeColor)}` : undefined,
            textShadow: preset.style.shadow ? "0 2px 6px rgba(0, 0, 0, 0.6)" : undefined,
          }}
        >
          Aa
        </span>
        <span className="gc-preset-name">{preset.name}</span>
      </button>
    ))}
  </div>
);
