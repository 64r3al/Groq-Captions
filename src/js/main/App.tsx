import { useEffect, useState } from "react";
import { Settings as SettingsIcon, X } from "lucide-react";
import { applyHostTheme } from "../lib/services/theme";
import { Button } from "./ui/Button";
import { CollapsibleSection } from "./ui/SectionHeader";
import { EmptyState } from "./ui/EmptyState";
import { TranscribeTab } from "./components/TranscribeTab";
import { SettingsTab } from "./components/SettingsTab";
import "./app.scss";

export const App = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    applyHostTheme();
  }, []);

  return (
    <div className="gc-app">
      <header className="gc-app-header">
        <span className="gc-app-wordmark">Groq Captions</span>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label="Settings"
          icon={<SettingsIcon size={16} />}
          onClick={() => setSettingsOpen(true)}
        />
      </header>

      <main className="gc-app-body">
        <TranscribeTab onNeedApiKey={() => setSettingsOpen(true)} />

        <CollapsibleSection
          title="Export"
          subtitle="SRT, VTT, JSON, plain text"
          open={exportOpen}
          onToggle={() => setExportOpen((o) => !o)}
        >
          <EmptyState
            title="Coming soon"
            description="Export formats are planned for a later update - for now, captions live directly in your After Effects comp."
          />
        </CollapsibleSection>
      </main>

      {settingsOpen && (
        <div className="gc-app-slideover-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="gc-app-slideover" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Settings">
            <div className="gc-app-slideover-header">
              <span>Settings</span>
              <Button variant="ghost" size="sm" iconOnly aria-label="Close" icon={<X size={16} />} onClick={() => setSettingsOpen(false)} />
            </div>
            <div className="gc-app-slideover-body">
              <SettingsTab />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
