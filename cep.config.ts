import type { CEP_Config } from "vite-cep-plugin";
import { version } from "./package.json";

// IMPORTANT: this file's default export is imported by src/shared/shared.ts, which is in turn
// reachable from src/jsx/index.ts - meaning everything at this module's top level gets bundled
// into the ExtendScript (ES3, runs *inside After Effects*) host output too, not just used by
// the Node-side Vite build. `process` doesn't exist in ExtendScript's global scope, so this
// file must stay a plain data literal with no `process.env` reads or other side effects - the
// actual ZXP_PASSWORD sourcing/validation lives in vite.config.ts instead (never bundled into
// the host output), which overwrites the placeholder below before vite-cep-plugin signs a
// package. See docs/ARCHITECTURE.md.

const config: CEP_Config = {
  version,
  id: "com.groqcaptions.panel",
  displayName: "Groq Captions",
  symlink: "local",
  port: 3000,
  servePort: 5000,
  startingDebugPort: 8860,
  extensionManifestVersion: 6.0,
  requiredRuntimeVersion: 9.0,
  hosts: [{ name: "AEFT", version: "[24.0,99.9]" }],

  type: "Panel",
  iconDarkNormal: "./src/assets/light-icon.png",
  iconNormal: "./src/assets/dark-icon.png",
  iconDarkNormalRollOver: "./src/assets/light-icon.png",
  iconNormalRollOver: "./src/assets/dark-icon.png",
  parameters: ["--v=0", "--enable-nodejs", "--mixed-context"],
  width: 420,
  height: 620,

  panels: [
    {
      mainPath: "./main/index.html",
      name: "main",
      panelDisplayName: "Groq Captions",
      autoVisible: true,
      width: 420,
      height: 620,
    },
  ],
  build: {
    jsxBin: "off",
    sourceMap: true,
  },
  zxp: {
    country: "US",
    province: "CA",
    org: "Groq Captions",
    // Placeholder only - vite.config.ts overwrites this with ZXP_PASSWORD before signing.
    // Never a real secret, so it's fine for this literal object to be bundled anywhere.
    password: "",
    tsa: [
      "http://timestamp.digicert.com/", // Windows Only
      "http://timestamp.apple.com/ts01", // MacOS Only
    ],
    allowSkipTSA: false,
    sourceMap: false,
    jsxBin: "off",
  },
  installModules: [],
  copyAssets: [],
  copyZipAssets: [],
};
export default config;
