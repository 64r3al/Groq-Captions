import { evalTS } from "../utils/bolt";
import { FALLBACK_FONTS, normalizeFontList, type FontInfo } from "../../../shared/fonts";

export type FontSource = "installed" | "fallback";

export interface FontList {
  fonts: FontInfo[];
  source: FontSource;
}

const CACHE_KEY = "pca_installed_fonts_v1";
const OVERRIDE_KEY = "pca_font_override";

let memoryCache: FontList | null = null;

/** Last list read from After Effects, so the picker opens instantly on the next panel launch.
 * Reading every installed font can take a few seconds on machines with large libraries. */
export const getCachedFonts = (): FontList | null => {
  if (memoryCache) return memoryCache;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const fonts = normalizeFontList(JSON.parse(raw));
    if (!fonts.length) return null;
    memoryCache = { fonts, source: "installed" };
    return memoryCache;
  } catch {
    return null;
  }
};

export const loadInstalledFonts = async (): Promise<FontList> => {
  let fonts: FontInfo[] = [];
  try {
    fonts = normalizeFontList(await evalTS("listFonts"));
  } catch {
    fonts = [];
  }
  if (!fonts.length) {
    memoryCache = { fonts: normalizeFontList(FALLBACK_FONTS), source: "fallback" };
    return memoryCache;
  }
  memoryCache = { fonts, source: "installed" };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(fonts));
  } catch {
    // quota or storage disabled: the in-memory cache still covers this session
  }
  return memoryCache;
};

export const getSavedFontOverride = (): string | null => {
  try {
    return localStorage.getItem(OVERRIDE_KEY) || null;
  } catch {
    return null;
  }
};

export const saveFontOverride = (postScriptName: string | null): void => {
  try {
    if (postScriptName) localStorage.setItem(OVERRIDE_KEY, postScriptName);
    else localStorage.removeItem(OVERRIDE_KEY);
  } catch {
    // not critical: the choice just won't survive a panel reload
  }
};
