import { useState } from "react";
import { Popover } from "./Popover";
import { Input } from "./Input";
import { usePersistedState } from "./hooks";
import { hexToInt, intToHex } from "./color";

export interface ColorSwatchProps {
  /** 0xRRGGBB integer, matching CaptionStyle's color fields - no conversion needed at the
   * call site. */
  value: number;
  onChange: (value: number) => void;
  label?: string;
}

const RECENT_KEY = "gc-recent-colors";
const MAX_RECENT = 8;

/** A swatch button that opens a popover with the OS-native color picker (as the actual pick
 * surface, so we're not hand-rolling an HSV canvas), a hex field for typing an exact value,
 * and a row of recently-used colors persisted across sessions. */
export const ColorSwatch = ({ value, onChange, label }: ColorSwatchProps) => {
  const [open, setOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(intToHex(value));
  const [recent, setRecent] = usePersistedState<string[]>(RECENT_KEY, []);

  const commit = (n: number) => {
    onChange(n);
    setHexDraft(intToHex(n));
  };

  const remember = (hex: string) => {
    const next = [hex, ...recent.filter((c) => c !== hex)].slice(0, MAX_RECENT);
    setRecent(next);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) remember(intToHex(value));
    setOpen(next);
  };

  return (
    <div className="gc-field">
      {label && <span className="gc-field-label">{label}</span>}
      <Popover
        open={open}
        onOpenChange={handleOpenChange}
        anchor={
          <button
            type="button"
            className="gc-swatch-button"
            aria-label={label ? `${label} color` : "Color"}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="gc-swatch-fill" style={{ backgroundColor: intToHex(value) }} />
          </button>
        }
      >
        <div className="gc-swatch-popover">
          <input
            type="color"
            className="gc-swatch-native"
            value={intToHex(value)}
            onChange={(e) => commit(hexToInt(e.target.value) ?? value)}
          />
          <Input
            value={hexDraft}
            onChange={(e) => setHexDraft(e.target.value)}
            onBlur={() => {
              const n = hexToInt(hexDraft);
              if (n !== null) commit(n);
              else setHexDraft(intToHex(value));
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const n = hexToInt(hexDraft);
              if (n !== null) commit(n);
            }}
          />
          {recent.length > 0 && (
            <div className="gc-swatch-recent">
              {recent.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className="gc-swatch-recent-item"
                  style={{ backgroundColor: hex }}
                  aria-label={hex}
                  onClick={() => commit(hexToInt(hex) ?? value)}
                />
              ))}
            </div>
          )}
        </div>
      </Popover>
    </div>
  );
};
