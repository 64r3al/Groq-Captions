import { csi } from "../utils/bolt";

// Matches the host app's theme (dark/light, accent colors, base font) so the panel doesn't
// look like a foreign browser page dropped into After Effects. AE broadcasts a
// ThemeColorChanged CSXS event whenever the user switches UI brightness in Preferences.

const toRgb = (c: { red: number; green: number; blue: number }) =>
  `rgb(${c.red}, ${c.green}, ${c.blue})`;

const toRgba = (c: { red: number; green: number; blue: number; alpha: number }) =>
  `rgba(${c.red}, ${c.green}, ${c.blue}, ${c.alpha / 255})`;

const applyFromSkinInfo = (): void => {
  let skin;
  try {
    skin = csi.getHostEnvironment().appSkinInfo;
  } catch {
    return;
  }
  if (!skin) return;

  const root = document.documentElement.style;
  const bg = skin.panelBackgroundColor?.color;
  const appBar = skin.appBarBackgroundColorSRGB?.color;
  if (bg) {
    root.setProperty("--gc-bg", toRgb(bg));
    // A rough luminance check so text/borders flip to something readable against either
    // AE's dark (default) or light UI brightness setting.
    const luminance = (bg.red * 299 + bg.green * 587 + bg.blue * 114) / 1000;
    const isDark = luminance < 128;
    root.setProperty("--gc-fg", isDark ? "#e8e8e8" : "#1a1a1a");
    root.setProperty("--gc-fg-muted", isDark ? "#9a9a9a" : "#5a5a5a");
    root.setProperty("--gc-border", isDark ? "#3a3a3a" : "#c9c9c9");
    root.setProperty("--gc-panel", isDark ? "#2b2b2b" : "#f2f2f2");
    root.setProperty("--gc-input-bg", isDark ? "#1e1e1e" : "#ffffff");
  }
  if (appBar) {
    root.setProperty("--gc-bg-alt", toRgba(appBar));
  }
  if (skin.baseFontFamily) {
    root.setProperty("--gc-font-family", skin.baseFontFamily);
  }
  if (skin.baseFontSize) {
    root.setProperty("--gc-font-size", `${skin.baseFontSize}px`);
  }
};

export const applyHostTheme = (): void => {
  if (typeof window.cep === "undefined") return;
  applyFromSkinInfo();
  csi.addEventListener("com.adobe.csxs.events.ThemeColorChanged", applyFromSkinInfo);
};
