import type { CEP_Config } from "vite-cep-plugin";
import { version } from "./package.json";

// Only `npm run zxp` / `npm run zip` actually sign a package; every other script (dev, build,
// typecheck) imports this file too, so the password must not be required outside that path.
const isSigningZxp =
  process.env.ZXP_PACKAGE === "true" || process.env.ZIP_PACKAGE === "true";
const zxpPassword = process.env.ZXP_PASSWORD || "";
if (isSigningZxp && !zxpPassword) {
  throw new Error(
    "ZXP_PASSWORD is not set. Set it in your shell (or a local, git-ignored .env.local " +
      "exported before this command) before running `npm run zxp` / `npm run zip` — the " +
      "certificate password must never be committed to this public repo."
  );
}

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
    password: zxpPassword,
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
