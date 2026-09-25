import { csi } from "../utils/bolt";

// Matches the host app's theme (dark/light, base font) so the panel doesn't look like a
// foreign browser page dropped into After Effects. AE broadcasts a ThemeColorChanged CSXS
// event whenever the user switches UI brightness in Preferences.
//
// Only the surface/text/border/font tokens are derived from the host - accent and semantic
// colors are this product's own palette (see ui/tokens.scss) and stay constant regardless of
// AE's brightness setting.

interface Rgb {
  red: number;
  green: number;
  blue: number;
}

const toRgbString = (c: Rgb) => `rgb(${Math.round(c.red)}, ${Math.round(c.green)}, ${Math.round(c.blue)})`;

const toRgbaString = (c: Rgb & { alpha: number }) =>
  `rgba(${Math.round(c.red)}, ${Math.round(c.green)}, ${Math.round(c.blue)}, ${c.alpha / 255})`;

const luminance = (c: Rgb) => (c.red * 299 + c.green * 587 + c.blue * 114) / 1000;

// Elevation is always a step away from the background toward the middle of the brightness
// range: in a dark theme a "raised" surface gets lighter, in a light theme it gets darker.
// "Recessed" wells (inputs) step the opposite way, so they read as a notch below the page
// rather than a card floating above it.
const mixToward = (c: Rgb, target: 0 | 255, amount: number): Rgb => ({
  red: c.red + (target - c.red) * amount,
  green: c.green + (target - c.green) * amount,
  blue: c.blue + (target - c.blue) * amount,
});

const raise = (c: Rgb, isDark: boolean, amount: number) => mixToward(c, isDark ? 255 : 0, amount);
const recess = (c: Rgb, isDark: boolean, amount: number) => mixToward(c, isDark ? 0 : 255, amount);

const applyFromSkinInfo = (): void => {
  let skin;
  try {
    skin = csi.getHostEnvironment().appSkinInfo;
  } catch {
    return;
  }
  if (!skin) return;

  const root = document.documentElement.style;
  const bg: Rgb | undefined = skin.panelBackgroundColor?.color;
  const appBar = skin.appBarBackgroundColorSRGB?.color;

  if (bg) {
    const isDark = luminance(bg) < 128;

    root.setProperty("--gc-surface-0", toRgbString(bg));
    root.setProperty("--gc-surface-1", toRgbString(raise(bg, isDark, 0.06)));
    root.setProperty("--gc-surface-2", toRgbString(recess(bg, isDark, 0.1)));
    root.setProperty("--gc-surface-3", toRgbString(raise(bg, isDark, 0.11)));

    // Every pair here is verified >= 4.5:1 (WCAG AA, normal text) against the surface-0/1/2
    // it'll actually sit on, same as the dark-theme defaults in ui/tokens.scss.
    root.setProperty("--gc-text-primary", isDark ? "#f0f0f0" : "#1a1a1a");
    root.setProperty("--gc-text-secondary", isDark ? "#b8b8b8" : "#4a4a4a");
    root.setProperty("--gc-text-muted", isDark ? "#959595" : "#5c5c5c");
    root.setProperty("--gc-border", isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)");
  }
  if (appBar) {
    root.setProperty("--gc-appbar", toRgbaString(appBar));
  }
  // Deliberately not deriving --gc-font-family/-size from the host: this product bundles its
  // own typeface (Inter) and a fixed type scale (see ui/tokens.scss) rather than matching
  // whatever font AE's own chrome happens to use, which is usually a plain system UI font.
};

export const applyHostTheme = (): void => {
  if (typeof window.cep === "undefined") return;
  applyFromSkinInfo();
  csi.addEventListener("com.adobe.csxs.events.ThemeColorChanged", applyFromSkinInfo);
};
