import { fs, https, path } from "../cep/node";
import { assertNodeAvailable, getExtensionRoot } from "./env";
import { getStoredApiKey, setStoredApiKey } from "./settingsStore";
import { GROQ_MODELS_URL } from "../../../shared/constants";
import type { ApiKeyStatus } from "../../../shared/types";

/** Reads GROQ_API_KEY out of a dev-only .env.local sitting next to the extension. Never part
 * of the packaged ZXP: production installs live outside this repo checkout and simply won't
 * have the file, so this silently returns null there (which is exactly the BYOK behavior we
 * want for a release build). */
const readEnvLocalKey = (): string | null => {
  const file = path.join(getExtensionRoot(), ".env.local");
  if (!fs.existsSync(file)) return null;
  const contents = fs.readFileSync(file, { encoding: "utf-8" });
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== "GROQ_API_KEY") continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value || null;
  }
  return null;
};

const last4 = (key: string): string => key.slice(-4);

export const resolveApiKey = (): { key: string | null; status: ApiKeyStatus } => {
  assertNodeAvailable();
  const stored = getStoredApiKey();
  if (stored) {
    return { key: stored, status: { source: "settings", last4: last4(stored) } };
  }
  const fromEnv = readEnvLocalKey();
  if (fromEnv) {
    return { key: fromEnv, status: { source: "env", last4: last4(fromEnv) } };
  }
  return { key: null, status: { source: "none", last4: "" } };
};

export const saveApiKey = (apiKey: string): void => {
  setStoredApiKey(apiKey.trim());
};

export const clearStoredApiKey = (): void => {
  setStoredApiKey("");
};

export interface TestApiKeyResult {
  ok: boolean;
  status: number;
  message: string;
}

/** GET /models with the given key: 200 = valid, 401 = invalid/revoked, anything else surfaces
 * the status code so the user isn't left guessing. */
export const testApiKey = (apiKey: string): Promise<TestApiKeyResult> => {
  assertNodeAvailable();
  return new Promise((resolve) => {
    const url = new URL(GROQ_MODELS_URL);
    const req = https.request(
      {
        method: "GET",
        hostname: url.hostname,
        path: url.pathname,
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 15000,
      },
      (res: any) => {
        let body = "";
        res.on("data", (chunk: Buffer) => (body += chunk));
        res.on("end", () => {
          const status = res.statusCode || 0;
          if (status === 200) {
            resolve({ ok: true, status, message: "Key is valid." });
          } else if (status === 401) {
            resolve({ ok: false, status, message: "Invalid or revoked API key." });
          } else {
            resolve({
              ok: false,
              status,
              message: `Groq responded with status ${status}.`,
            });
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("Request timed out.")));
    req.on("error", (err: Error) =>
      resolve({ ok: false, status: 0, message: err.message })
    );
    req.end();
  });
};
