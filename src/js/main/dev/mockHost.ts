// Dev-only: lets `npm run dev` exercise real UI states (a selected layer, a build result) in
// a plain browser, where there's no real CEP bridge to answer evalTS()/csi calls. Only ever
// installed from index-react.tsx behind `import.meta.env.DEV`, and only takes effect when
// window.cep (the real CEP Node bridge) is absent - inside After Effects this is always a
// no-op, so nothing here can affect the packaged extension's behavior.
import { ns } from "../../../shared/shared";
import type {
  BuildCaptionsResult,
  CaptionGroupData,
  CaptionStyle,
  SelectedAudioLayerInfo,
} from "../../../shared/types";

const MOCK_SELECTION: SelectedAudioLayerInfo = {
  compId: 1,
  compName: "Podcast Clip",
  compWidth: 1920,
  compHeight: 1080,
  compFrameRate: 30,
  compDuration: 42.5,
  layerIndex: 1,
  layerName: "interview_raw.wav",
  sourceFilePath: "/Users/demo/Desktop/interview_raw.wav",
  sourceFileName: "interview_raw.wav",
  sourceFileSizeBytes: 6_400_000,
  startTime: 0,
  stretchPercent: 100,
  inPoint: 0,
  outPoint: 42.5,
  sourceInSeconds: 0,
  sourceDurationSeconds: 42.5,
};

const MOCK_SKIN_INFO = {
  appSkinInfo: {
    panelBackgroundColor: { color: { red: 30, green: 30, blue: 30, alpha: 255 } },
    appBarBackgroundColorSRGB: { color: { red: 38, green: 38, blue: 38, alpha: 255 } },
  },
};

let buildCount = 0;

// Keyed by the ExtendScript function name evalTS() invokes (see lib/utils/bolt.ts#evalTS) -
// each handler receives the same, already-deserialized arguments the real host function would.
const MOCK_HANDLERS: Record<string, (...args: any[]) => unknown> = {
  getSelectedAudioLayerInfo: () => MOCK_SELECTION,
  pickFfmpegExecutable: () => null,
  buildCaptions: (_compId: number, groups: CaptionGroupData[], _style: CaptionStyle): BuildCaptionsResult => {
    buildCount += 1;
    return {
      words: groups.reduce((n, g) => n + g.words.length, 0),
      captions: groups.length,
      precompName: `Captions ${buildCount}`,
    };
  },
};

/** evalTS() always generates `host["${ns}"].${functionName}(${jsonArgs});JSON.stringify(res)`
 * (see lib/utils/bolt.ts). Each arg was independently JSON.stringify'd, so wrapping the
 * captured argument text in `[...]` yields valid JSON we can JSON.parse - no eval needed. */
const parseEvalScriptCall = (script: string): { fnName: string; args: unknown[] } | null => {
  const match = new RegExp(`\\["${ns}"\\]\\.([a-zA-Z0-9_]+)\\(([\\s\\S]*?)\\);\\s*JSON\\.stringify\\(res\\)`).exec(
    script
  );
  if (!match) return null;
  const [, fnName, argsText] = match;
  try {
    return { fnName, args: JSON.parse(`[${argsText}]`) };
  } catch {
    return { fnName, args: [] };
  }
};

export const installMockHost = (): void => {
  if (typeof window.cep !== "undefined") return;
  if (window.__adobe_cep__) return;

  window.__adobe_cep__ = {
    getHostEnvironment: () => JSON.stringify(MOCK_SKIN_INFO),
    getSystemPath: () => "/mock/extension/root",
    getCurrentApiVersion: () => JSON.stringify({ major: 12, minor: 0, micro: 0 }),
    getExtensionId: () => "com.groqcaptions.mock",
    getApplicationID: () => "AEFT",
    addEventListener: () => {},
    removeEventListener: () => {},
    evalScript: (script: string, callback?: (result: string) => void) => {
      const parsed = parseEvalScriptCall(script);
      const handler = parsed ? MOCK_HANDLERS[parsed.fnName] : undefined;
      window.setTimeout(() => {
        if (!parsed || !handler) {
          callback?.(
            JSON.stringify({ name: "Error", message: `Mock host has no handler for "${parsed?.fnName}".` })
          );
          return;
        }
        try {
          callback?.(JSON.stringify(handler(...parsed.args)));
        } catch (err: any) {
          callback?.(JSON.stringify({ name: "Error", message: err?.message || String(err) }));
        }
      }, 300);
    },
  } as unknown as Window["__adobe_cep__"];
};
