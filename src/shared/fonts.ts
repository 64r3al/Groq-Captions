import type { FontInfo } from "./types";

export type { FontInfo };

export interface CssFont {
  fontFamily: string;
  fontWeight: number;
  fontStyle: "normal" | "italic";
}

const WEIGHTS: [RegExp, number][] = [
  [/(hairline|thin)/i, 100],
  [/(extra|ultra)[\s-]?light/i, 200],
  [/light/i, 300],
  [/(semi|demi)[\s-]?bold/i, 600],
  [/(extra|ultra)[\s-]?bold|heavy/i, 800],
  [/black/i, 900],
  [/bold/i, 700],
  [/medium/i, 500],
];

export const weightFromStyle = (style: string): number => {
  for (const [re, weight] of WEIGHTS) if (re.test(style)) return weight;
  return 400;
};

const isItalic = (style: string): boolean => /(italic|oblique)/i.test(style);

/** Family names for PostScript prefixes that don't read as their family ("ArialMT"). */
const KNOWN_FAMILIES: Record<string, string> = {
  ArialMT: "Arial",
  Arial: "Arial",
  "Arial-Black": "Arial Black",
  TimesNewRomanPS: "Times New Roman",
  TimesNewRomanPSMT: "Times New Roman",
  CourierNewPS: "Courier New",
  CourierNewPSMT: "Courier New",
  TrebuchetMS: "Trebuchet MS",
  ComicSansMS: "Comic Sans MS",
};

/** Best-effort family/style from a PostScript name alone, for when the installed-font list
 * isn't available (e.g. After Effects older than 2024). "Arial-BoldMT" -> Arial / Bold. */
export const parsePostScriptName = (postScriptName: string): { family: string; style: string } => {
  if (KNOWN_FAMILIES[postScriptName]) return { family: KNOWN_FAMILIES[postScriptName], style: "Regular" };
  const dash = postScriptName.indexOf("-");
  const rawFamily = dash === -1 ? postScriptName : postScriptName.slice(0, dash);
  const rawStyle = dash === -1 ? "Regular" : postScriptName.slice(dash + 1).replace(/(MT|PS)$/, "");
  const family =
    KNOWN_FAMILIES[rawFamily] ??
    rawFamily
      .replace(/(MT|PS)$/, "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .trim();
  return { family, style: rawStyle || "Regular" };
};

const quoteFamily = (family: string): string => `"${family.replace(/"/g, "")}"`;

/** CSS for previewing a PostScript font, preferring the exact entry from the installed list. */
export const cssFontFor = (postScriptName: string, installed: FontInfo[]): CssFont => {
  const match = installed.find((f) => f.postScriptName === postScriptName);
  const { family, style } = match ?? parsePostScriptName(postScriptName);
  return {
    fontFamily: `${quoteFamily(family)}, sans-serif`,
    fontWeight: weightFromStyle(style),
    fontStyle: isItalic(style) ? "italic" : "normal",
  };
};

export const fontLabel = (postScriptName: string, installed: FontInfo[]): string => {
  const match = installed.find((f) => f.postScriptName === postScriptName);
  const { family, style } = match ?? parsePostScriptName(postScriptName);
  return style && !/^regular$/i.test(style) ? `${family} ${style}` : family;
};

/** De-duplicates by PostScript name and sorts by family then style, regular-ish first. */
export const normalizeFontList = (fonts: FontInfo[]): FontInfo[] => {
  const seen = new Set<string>();
  const out: FontInfo[] = [];
  for (const f of fonts) {
    if (!f || !f.postScriptName || seen.has(f.postScriptName)) continue;
    seen.add(f.postScriptName);
    out.push({ postScriptName: f.postScriptName, family: f.family || f.postScriptName, style: f.style || "Regular" });
  }
  return out.sort(
    (a, b) =>
      a.family.localeCompare(b.family) ||
      weightFromStyle(a.style) - weightFromStyle(b.style) ||
      Number(isItalic(a.style)) - Number(isItalic(b.style)) ||
      a.style.localeCompare(b.style)
  );
};

/** Case-insensitive match on family, style, or PostScript name; every word must match. */
export const filterFonts = (fonts: FontInfo[], query: string): FontInfo[] => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return fonts;
  return fonts.filter((f) => {
    const hay = `${f.family} ${f.style} ${f.postScriptName}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
};

/** Fonts that ship with both Windows and macOS, offered when the installed list can't be read. */
export const FALLBACK_FONTS: FontInfo[] = [
  { postScriptName: "ArialMT", family: "Arial", style: "Regular" },
  { postScriptName: "Arial-BoldMT", family: "Arial", style: "Bold" },
  { postScriptName: "Arial-Black", family: "Arial Black", style: "Regular" },
  { postScriptName: "Impact", family: "Impact", style: "Regular" },
  { postScriptName: "Georgia", family: "Georgia", style: "Regular" },
  { postScriptName: "Georgia-Bold", family: "Georgia", style: "Bold" },
  { postScriptName: "Verdana-Bold", family: "Verdana", style: "Bold" },
  { postScriptName: "TrebuchetMS-Bold", family: "Trebuchet MS", style: "Bold" },
  { postScriptName: "CourierNewPS-BoldMT", family: "Courier New", style: "Bold" },
  { postScriptName: "TimesNewRomanPS-BoldMT", family: "Times New Roman", style: "Bold" },
];
