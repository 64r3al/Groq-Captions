import { useEffect, useMemo, useRef, useState } from "react";
import { cssFontFor, filterFonts, fontLabel, type FontInfo } from "../../../shared/fonts";
import type { FontSource } from "../../lib/services/fonts";

const MAX_ROWS = 250;

export const FontPicker = ({
  value,
  presetFont,
  fonts,
  source,
  loading,
  onOpen,
  onChange,
  onRefresh,
}: {
  /** Chosen PostScript name, or null to use the preset's font. */
  value: string | null;
  presetFont: string;
  fonts: FontInfo[];
  source: FontSource | null;
  loading: boolean;
  onOpen: () => void;
  onChange: (postScriptName: string | null) => void;
  onRefresh: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const current = value ?? presetFont;
  const matches = useMemo(() => filterFonts(fonts, query), [fonts, query]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const toggle = () => {
    if (!open) onOpen();
    setOpen(!open);
  };

  const pick = (postScriptName: string | null) => {
    onChange(postScriptName);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="flex flex-col bg-surface-container-lowest rounded">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex items-center justify-between gap-space-sm px-space-sm min-h-[36px] rounded hover:bg-surface-container-low transition-colors cursor-pointer w-full text-left"
      >
        <span className="flex items-center gap-space-xs shrink-0">
          <span className="material-symbols-outlined text-[15px] text-on-surface-variant">font_download</span>
          <span className="font-body-sm text-body-sm text-on-surface">Font</span>
        </span>
        <span className="flex items-center gap-space-xs min-w-0">
          <span className="truncate text-[13px] text-on-surface" style={cssFontFor(current, fonts)}>
            {fontLabel(current, fonts)}
          </span>
          {!value && <span className="font-label-xs text-label-xs text-on-surface-variant shrink-0">preset</span>}
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">
            {open ? "expand_less" : "expand_more"}
          </span>
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-space-xs p-space-xs border-t border-outline-variant/30">
          <div className="flex items-center gap-space-xs">
            <div className="flex items-center flex-1 h-8 bg-surface-container-high rounded px-space-sm gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">search</span>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search installed fonts"
                className="flex-1 min-w-0 bg-transparent outline-none text-on-surface font-body-md text-body-md placeholder:text-on-surface-variant"
              />
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Re-read installed fonts"
              className="h-8 w-8 flex items-center justify-center rounded bg-surface-container-high text-on-surface-variant hover:text-on-surface disabled:opacity-50 cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>refresh</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => pick(null)}
            className={`flex items-center justify-between min-h-[32px] px-space-sm rounded text-left cursor-pointer ${
              value === null ? "bg-primary/15 text-primary" : "text-on-surface hover:bg-surface-container-high"
            }`}
          >
            <span className="font-body-md text-body-md">Use preset font ({fontLabel(presetFont, fonts)})</span>
            {value === null && <span className="material-symbols-outlined text-[16px]">check</span>}
          </button>

          <div className="max-h-64 overflow-y-auto flex flex-col" role="listbox">
            {loading && !fonts.length ? (
              <div className="py-space-md text-center font-body-sm text-body-sm text-on-surface-variant">
                Reading installed fonts…
              </div>
            ) : matches.length === 0 ? (
              <div className="py-space-md text-center font-body-sm text-body-sm text-on-surface-variant">
                No fonts match "{query}".
              </div>
            ) : (
              matches.slice(0, MAX_ROWS).map((f) => (
                <button
                  key={f.postScriptName}
                  type="button"
                  role="option"
                  aria-selected={value === f.postScriptName}
                  onClick={() => pick(f.postScriptName)}
                  title={f.postScriptName}
                  className={`flex items-center justify-between gap-space-sm min-h-[32px] px-space-sm rounded text-left cursor-pointer shrink-0 ${
                    value === f.postScriptName ? "bg-primary/15 text-primary" : "text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  <span className="truncate text-[14px]" style={cssFontFor(f.postScriptName, fonts)}>
                    {f.family}
                  </span>
                  <span className="font-label-xs text-label-xs text-on-surface-variant shrink-0">{f.style}</span>
                </button>
              ))
            )}
          </div>

          <div className="flex items-center justify-between font-label-xs text-label-xs text-on-surface-variant px-space-xs">
            <span>
              {source === "fallback"
                ? "Showing common fonts (installed list needs After Effects 2024+)"
                : `${fonts.length} installed fonts`}
            </span>
            {matches.length > MAX_ROWS && <span>Showing {MAX_ROWS} of {matches.length}, refine search</span>}
          </div>
        </div>
      )}
    </div>
  );
};
