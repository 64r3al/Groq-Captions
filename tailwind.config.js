/** Theme matches the panel design (src/js/main/ui/pro-studio.scss). Compiled at build time so
 * the panel never depends on a CDN inside After Effects. */
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: { relative: true, files: ["./src/js/**/*.{ts,tsx,html}"] },
  theme: {
    extend: {
      colors: {
        "surface-tint": "#c0c1ff",
        "on-tertiary": "#630f00",
        "on-tertiary-container": "#570c00",
        "on-secondary-container": "#c4abff",
        "error-container": "#93000a",
        "surface-variant": "#353535",
        "on-secondary": "#3c0091",
        "surface-dim": "#131313",
        "inverse-on-surface": "#303030",
        "surface-container-low": "#1b1b1c",
        "primary": "#c0c1ff",
        "on-error": "#690005",
        "tertiary-container": "#fd5835",
        "on-secondary-fixed-variant": "#5516be",
        "on-primary-fixed": "#07006c",
        "inverse-surface": "#e5e2e1",
        "inverse-primary": "#494bd6",
        "on-surface": "#e5e2e1",
        "on-primary-container": "#0d0096",
        "on-secondary-fixed": "#23005c",
        "background": "#131313",
        "primary-container": "#8083ff",
        "on-primary": "#1000a9",
        "surface-container-lowest": "#0e0e0e",
        "on-primary-fixed-variant": "#2f2ebe",
        "secondary-fixed": "#e9ddff",
        "surface-container-highest": "#353535",
        "primary-fixed": "#e1e0ff",
        "surface-container-high": "#2a2a2a",
        "surface-container": "#202020",
        "secondary-container": "#571bc1",
        "on-tertiary-fixed-variant": "#8c1900",
        "secondary-fixed-dim": "#d0bcff",
        "tertiary-fixed": "#ffdad2",
        "error": "#ffb4ab",
        "on-tertiary-fixed": "#3d0600",
        "secondary": "#d0bcff",
        "primary-fixed-dim": "#c0c1ff",
        "on-background": "#e5e2e1",
        "on-surface-variant": "#c7c4d7",
        "tertiary": "#ffb4a3",
        "surface-bright": "#393939",
        "tertiary-fixed-dim": "#ffb4a3",
        "outline": "#908fa0",
        "on-error-container": "#ffdad6",
        "outline-variant": "#464554",
        "surface": "#131313"
      },
      borderRadius: {
        "xs": "0.125rem",
        "DEFAULT": "0.125rem",
        "sm": "0.125rem",
        "md": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "space-xl": "0.75rem",
        "space-lg": "0.5rem",
        "space-xs": "0.125rem",
        "space-md": "0.375rem",
        "margin": "0.5rem",
        "space-sm": "0.25rem",
        "gutter": "0.5rem"
      },
      fontFamily: {
        "headline-xs": ["Geist", "sans-serif"],
        "body-md": ["Geist", "sans-serif"],
        "label-md": ["JetBrains Mono", "monospace"],
        "label-xs": ["JetBrains Mono", "monospace"],
        "headline-sm": ["Geist", "sans-serif"],
        "body-sm": ["Geist", "sans-serif"],
        "label-sm": ["JetBrains Mono", "monospace"]
      },
      fontSize: {
        "headline-xs": ["12px", { lineHeight: "16px", letterSpacing: "0em", fontWeight: "600" }],
        "body-md": ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "label-md": ["11px", { lineHeight: "14px", letterSpacing: "-0.02em", fontWeight: "500" }],
        "label-xs": ["9px", { lineHeight: "12px", letterSpacing: "0.02em", fontWeight: "500" }],
        "headline-sm": ["14px", { lineHeight: "18px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "body-sm": ["11px", { lineHeight: "14px", fontWeight: "400" }],
        "label-sm": ["10px", { lineHeight: "12px", letterSpacing: "-0.01em", fontWeight: "500" }]
      }
    }
  }
};
