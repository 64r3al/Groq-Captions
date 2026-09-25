import { useEffect, useState } from "react";
import { applyHostTheme } from "../lib/services/theme";
import { TranscribeTab } from "./components/TranscribeTab";
import { SettingsTab } from "./components/SettingsTab";
import { PlaceholderTab } from "./components/PlaceholderTab";
import "./main.scss";

type TabId = "transcribe" | "edit" | "style" | "export" | "settings";

const TABS: { id: TabId; label: string }[] = [
  { id: "transcribe", label: "Transcribe" },
  { id: "edit", label: "Edit" },
  { id: "style", label: "Style" },
  { id: "export", label: "Export" },
  { id: "settings", label: "Settings" },
];

export const App = () => {
  const [tab, setTab] = useState<TabId>("transcribe");

  useEffect(() => {
    applyHostTheme();
  }, []);

  return (
    <div className="app">
      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={"tab-button" + (tab === t.id ? " active" : "")}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {tab === "transcribe" && <TranscribeTab onNeedApiKey={() => setTab("settings")} />}
        {tab === "edit" && (
          <PlaceholderTab
            title="Transcript Editor"
            note="Coming in Phase 3: click a word to jump the playhead, edit text, split/merge captions, and nudge per-word timing."
          />
        )}
        {tab === "style" && (
          <PlaceholderTab
            title="Style"
            note="Coming in Phase 2/3: font, size, color, stroke, background box, position, and animation presets, plus save/load presets."
          />
        )}
        {tab === "export" && (
          <PlaceholderTab
            title="Export"
            note="Coming in Phase 4: SRT, VTT, JSON, and plain-text export of the current transcript."
          />
        )}
        {tab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
};
