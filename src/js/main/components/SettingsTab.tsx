import { useEffect, useState } from "react";
import { evalTS } from "../../lib/utils/bolt";
import { resolveApiKey, saveApiKey, clearStoredApiKey, testApiKey } from "../../lib/services/apiKey";
import { findFfmpeg, setFfmpegOverride } from "../../lib/services/ffmpeg";
import type { ApiKeyStatus } from "../../../shared/types";

const sourceLabel = (status: ApiKeyStatus): string => {
  if (status.source === "settings") return `Using saved key (…${status.last4})`;
  if (status.source === "env") return `Using GROQ_API_KEY from .env.local (…${status.last4})`;
  return "No API key configured yet.";
};

export const SettingsTab = () => {
  const [keyInput, setKeyInput] = useState("");
  const [status, setStatus] = useState<ApiKeyStatus>({ source: "none", last4: "" });
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [ffmpegPath, setFfmpegPath] = useState<string | null>(null);

  const refresh = () => {
    const { status } = resolveApiKey();
    setStatus(status);
    setFfmpegPath(findFfmpeg());
  };

  useEffect(refresh, []);

  const handleSave = () => {
    if (!keyInput.trim()) return;
    saveApiKey(keyInput.trim());
    setKeyInput("");
    setTestResult(null);
    refresh();
  };

  const handleClear = () => {
    clearStoredApiKey();
    setTestResult(null);
    refresh();
  };

  const handleTest = async () => {
    const { key } = resolveApiKey();
    const candidate = keyInput.trim() || key;
    if (!candidate) {
      setTestResult({ ok: false, message: "Enter an API key first." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    const result = await testApiKey(candidate);
    setTesting(false);
    setTestResult({ ok: result.ok, message: result.message });
  };

  const handleLocateFfmpeg = async () => {
    const picked = await evalTS("pickFfmpegExecutable");
    if (picked) {
      setFfmpegOverride(picked);
      setFfmpegPath(picked);
    }
  };

  return (
    <div className="pane">
      <section className="field-group">
        <h3>Groq API key</h3>
        <p className="hint">{sourceLabel(status)}</p>
        <div className="row">
          <input
            type="password"
            placeholder="gsk_..."
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
        </div>
        <div className="row button-row">
          <button onClick={handleSave} disabled={!keyInput.trim()}>
            Save key
          </button>
          <button onClick={handleTest} disabled={testing}>
            {testing ? "Testing…" : "Test key"}
          </button>
          <button className="secondary" onClick={handleClear} disabled={status.source !== "settings"}>
            Clear saved key
          </button>
        </div>
        {testResult && (
          <p className={testResult.ok ? "status-ok" : "status-error"}>{testResult.message}</p>
        )}
        <p className="hint small">
          Keys are stored encrypted in your OS user profile, never in this project's files. A
          key can also be provided via a local-only <code>.env.local</code> (GROQ_API_KEY=...)
          during development; a saved key here always takes priority.
        </p>
      </section>

      <section className="field-group">
        <h3>ffmpeg</h3>
        {ffmpegPath ? (
          <p className="hint">Found: {ffmpegPath}</p>
        ) : (
          <p className="hint status-error">
            Not found. Without ffmpeg, only short clips (≤25 MB, mp3/mp4/wav/m4a/flac/ogg/webm)
            can be sent directly to Groq.
          </p>
        )}
        <div className="row button-row">
          <button onClick={handleLocateFfmpeg}>Locate ffmpeg…</button>
        </div>
      </section>
    </div>
  );
};
