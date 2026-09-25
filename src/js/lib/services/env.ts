import { os, path } from "../cep/node";
import { csi } from "../utils/bolt";
import { APP_SETTINGS_DIR_NAME } from "../../../shared/constants";

/** Node integration (--enable-nodejs) is only present when the panel is actually hosted
 * inside CEP; the Vite dev server preview in a plain browser has no `window.cep`. Every
 * service function that touches fs/child_process/https should call this first so the
 * failure is a clear message instead of a cryptic "X is not a function". */
export const assertNodeAvailable = (): void => {
  if (typeof window.cep === "undefined") {
    throw new Error(
      "Node.js integration isn't available (this only works inside After Effects, with " +
        '"Allow Scripts to Write Files and Access Network" enabled).'
    );
  }
};

/** Per-OS, per-user directory for this extension's settings (API key, ffmpeg path override). */
export const getAppSettingsDir = (): string => {
  assertNodeAvailable();
  const platform = os.platform();
  if (platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      APP_SETTINGS_DIR_NAME
    );
  }
  if (platform === "win32") {
    const appData =
      window.cep_node.process.env.APPDATA ||
      path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, APP_SETTINGS_DIR_NAME);
  }
  return path.join(os.homedir(), ".config", APP_SETTINGS_DIR_NAME);
};

/** Absolute path to the extension's own install/dev root, i.e. where .env.local would live. */
export const getExtensionRoot = (): string => {
  assertNodeAvailable();
  return csi.getSystemPath("extension");
};
