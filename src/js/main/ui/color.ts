/** 0xRRGGBB integer <-> CSS hex string, shared by every component that renders a CaptionStyle
 * color (ColorSwatch, CaptionPreviewCanvas, PresetGallery) so the conversion logic lives in
 * exactly one place. */
export const intToHex = (n: number): string => `#${(n & 0xffffff).toString(16).padStart(6, "0")}`;

export const hexToInt = (hex: string): number | null => {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  return m ? parseInt(m[1], 16) : null;
};
