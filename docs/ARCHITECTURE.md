# Architecture

Per the master prompt's "before writing code" request: architecture, folder structure, data
model, and open questions/risks. This is written after Phase 1 exists, since the concrete
scaffold made several of these decisions easier to explain precisely than describing them in
the abstract — but it covers the full plan, not just what's built so far.

## Platform choice: CEP (not UXP)

UXP doesn't support After Effects yet, so CEP is the only option today, per the master
prompt. Scaffolded with [bolt-cep](https://github.com/hyperbrew/bolt-cep) (Vite + TypeScript
+ React) rather than hand-rolled, for three concrete reasons:

1. **`evalTS`**: a typed, promise-based bridge (`src/js/lib/utils/bolt.ts`) that serializes
   arguments/return values as JSON between the panel and ExtendScript, with host-side
   exceptions turned into rejected promises. This *is* the "typed bridge layer" the master
   prompt asks for.
2. **Adobe's real `CSInterface.js`**, not a hand-transcribed copy — panel/host communication,
   theming events, and file-system paths are foundational enough that subtle bugs here would
   be painful to track down without a real AE install to test against in this environment.
3. **Manifest + debug-mode + ZXP packaging** generation is handled by `vite-cep-plugin`
   instead of hand-written XML, removing an entire class of "extension won't load" bugs.

Everything CEP-specific and framework-provided is documented in `NOTICE.md` so it's clear
what's original to this project.

## Folder structure

```
cep.config.ts              Extension identity, panel size, icons, build/zxp settings
vite.config.ts              Panel build (React, → dist/cep/js)
vite.es.config.ts           ExtendScript build (TS → ES3, → dist/cep/jsx/index.js)

src/jsx/                    Host code — runs inside After Effects as ExtendScript (ES3)
  aeft/aeft.ts                 Functions callable from the panel via evalTS()
  lib/json2.js                 JSON polyfill (ES3 has no native JSON)
  index.ts                     Picks the right per-app module and exports the Scripts type

src/js/                     Panel code — runs in CEP's Chromium/Node context
  main/
    App.tsx                    Tab shell (Transcribe / Edit / Style / Export / Settings)
    components/                One component per tab
  lib/
    services/                  Node-side business logic (this project's, not bolt-cep's)
      env.ts                     Node-availability guard, settings-dir resolution
      settingsStore.ts           Encrypted-at-rest local settings (API key, ffmpeg path)
      apiKey.ts                  Key resolution (Settings > .env.local) + key testing
      ffmpeg.ts                  Locate ffmpeg, extract trimmed audio in the background
      groq.ts                    Groq Whisper API client (manual multipart, 429 backoff)
      theme.ts                   Match the host app's current color theme
    cep/, utils/                bolt-cep's CEP glue (CSInterface, evalTS, node.ts, theming)

src/shared/                 Types/constants used by both host and panel
  types.ts                    SelectedAudioLayerInfo, TranscriptWord/Result, ApiKeyStatus
  constants.ts                 Groq URLs, upload limits, model/language option lists

docs/ARCHITECTURE.md        This file
```

## Data flow (Phase 1)

```
 ExtendScript (src/jsx/aeft/aeft.ts)
   getSelectedAudioLayerInfo()  →  { compId, layerName, sourceFilePath,
                                      sourceInSeconds, sourceDurationSeconds, ... }
             │  evalTS (JSON over evalScript)
             ▼
 CEP panel (src/js/main/components/TranscribeTab.tsx)
   1. resolveApiKey()            settings.json (encrypted) → .env.local → none
   2. findFfmpeg() + extractAudio()   child_process, background, → temp .flac
   3. transcribe()                https POST (manual multipart) → Groq Whisper
   4. normalizeWords()            verbose_json → flat TranscriptWord[]
             │
             ▼
   rendered as text + a per-word timestamp table
```

Nothing gets written back into the AE project in Phase 1 — that's deliberate. Building
comps/layers is real, order-dependent AE-DOM work (Phase 2), and mixing it into the same
pass as "does transcription work at all" would make failures harder to attribute to either
half. `getSelectedAudioLayerInfo()` already returns everything Phase 2's comp builder will
need (`startTime`, `stretchPercent`, `inPoint`/`outPoint`, `compFrameRate`, `compDuration`)
so that step is additive, not a rewrite.

## Data model

### `SelectedAudioLayerInfo` (host → panel, per generate click)

The layer/comp facts only ExtendScript can read. `sourceInSeconds`/`sourceDurationSeconds`
are already source-time-mapped (accounting for `startTime`, `inPoint`/`outPoint` clamped to
the comp, and `stretch`) so the panel can hand them straight to ffmpeg's `-ss`/`-t`.

### `TranscriptResult` / `TranscriptWord` (Groq → panel)

```ts
interface TranscriptWord { text: string; start: number; end: number } // seconds, source-relative
interface TranscriptResult {
  text: string;
  language?: string;
  duration?: number;
  words: TranscriptWord[];      // from verbose_json.words, or spread evenly across segments
  segments: GroqSegment[];      // kept for avg_logprob/no_speech_prob (low-confidence flagging, Phase 3)
}
```

### Phase 2 addition (not yet implemented): the on-disk transcript JSON

The master prompt's "performance-first" comp-building approach — one text layer driven by
`footage("captions.json").sourceData` plus Expression Selectors, rather than baking N text
layers per caption immediately — needs a persisted, editable JSON file imported into the AE
project. Planned shape, extending `TranscriptWord` with the comp-time mapping and grouping
Phase 2 adds:

```ts
interface CaptionsFile {
  version: 1;
  compId: number;
  fps: number;
  words: { text: string; start: number; end: number }[]; // comp time, frame-quantized
  groups: { startWord: number; endWord: number; start: number; end: number; text: string }[];
  style: { /* font, size, colors, stroke, position, animation preset+params, ... */ };
}
```

Editing a word/timing in the Edit tab (Phase 3) means rewriting this file and letting the
expressions pick it up — no layer rebuild, per the master prompt. "Bake to layers" stays
available as an explicit opt-in for manual per-layer tweaking, reusing the
`addWordAnimator`/Expression-Selector logic already proven in `Groq_Captions.jsx`.

### Settings (`settingsStore.ts`, per-OS user profile dir, not in the repo)

```ts
interface StoredSettings {
  apiKey?: { iv: string; tag: string; data: string }; // AES-256-GCM, key in a sibling 0600 file
  ffmpegPath?: string;                                  // user override, if auto-detect failed
}
```

## Key decisions and why

- **Multipart built by hand instead of the `form-data` npm package** the master prompt's
  reference snippet uses. CEP's Node module resolution only sees packages actually shipped
  inside the extension; wiring up `installModules` (vite-cep-plugin's mechanism for copying
  npm deps into the packaged extension) for one dependency used to emit a few MIME boundary
  lines wasn't worth the packaging-time risk. `src/js/lib/services/groq.ts` builds the same
  wire format directly against Node's `https`.
- **Encrypted-at-rest file instead of a real OS keychain** for the saved API key
  (`settingsStore.ts`). A true keychain (macOS Keychain / Windows Credential Manager) needs a
  native module (e.g. `keytar`), which means prebuilt binaries per OS/arch shipped inside the
  extension — real work, and not testable in this sandbox. AES-256-GCM with a random
  locally-held key is what the master prompt names as the acceptable fallback ("OS keychain
  if possible, otherwise encrypted local storage"); upgrading to a real keychain is a good
  Phase 5 polish item.
- **No audio chunking yet.** The master prompt asks for splitting long audio into overlapping
  chunks with word de-duplication at the seams — real complexity that deserves its own pass
  rather than being bolted onto "does the basic call work." Phase 1 enforces the 25 MB/~20
  min ceiling with a clear error (same as the prototype); chunking is called out as unbuilt
  here rather than silently half-done.
- **No onset refinement (RMS energy snapping) yet.** Explicitly a Phase 2 item per the
  master prompt's own phase list, and it's meaningless without the frame-quantization/comp-
  time-mapping it sits on top of, which also lands in Phase 2.
- **`installModules: []` in `cep.config.ts` is correct, not an oversight.** That field copies
  third-party npm packages into the packaged extension so `require("pkg")` resolves at
  runtime in an installed ZXP (dev mode has full `node_modules`, but the shipped package
  doesn't). Every Node-side service (`ffmpeg.ts`, `groq.ts`, `settingsStore.ts`, `apiKey.ts`)
  uses only Node built-ins (`fs`, `https`, `child_process`, `os`, `path`, `crypto`) via
  `src/js/lib/cep/node.ts`'s `require()` wrapper — no third-party runtime package is ever
  `require()`'d. This is exactly why the multipart body is hand-built instead of using
  `form-data` (previous bullet): it lets `installModules` stay empty and removes a whole
  class of "works in dev, breaks once packaged" bugs.
- **`vitest` is pinned to `^3.2.7`, not upgraded to `5.x`**, despite `npm audit` flagging a
  moderate advisory ([GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9))
  in `@vitest/mocker`'s redirect-mock feature that spans the entire 2.x–4.x line and is only
  fixed in 5.0.2. We don't use mocking at all (the test suite is pure functions in and
  assertions out), vitest is dev-only tooling that never ships in the extension or runs
  against untrusted input, and 5.x raises the `@types/node`/Node engine floor in ways that
  weren't worth destabilizing the CEP build for a feature this project doesn't touch.
  Revisit if the test suite ever needs mocking, or when 5.x's peer requirements are less of
  a jump.
- **`cep.config.ts` must stay a side-effect-free plain data literal — no `process.env` reads,
  no top-level logic.** This bit us once already (caught before merging, not after): its
  default export is imported by `src/shared/shared.ts` for `ns`/`company`/etc., and
  `shared.ts` is imported by `src/jsx/index.ts` — meaning `cep.config.ts`'s *entire module
  body* gets bundled into the ExtendScript output that runs inside After Effects, not just
  used by the Node-side Vite build. A first version of the ZXP_PASSWORD fix (previous ARCHITECTURE
  revision) read `process.env.ZXP_PASSWORD` at this file's top level; `process` doesn't exist
  in ExtendScript's global scope, so that would have thrown the moment the host script loaded
  in AE, silently breaking the entire extension (not just packaging) — caught by grepping the
  actual compiled `dist/cep/jsx/index.js` output for `process`, not by `tsc` (which has no way
  to know this file crosses into the ES3 bundle) or by `vite build` succeeding (it did; the
  bug was in bundled *content*, not a build error). The real fix: keep `cep.config.ts` a pure
  literal (`zxp.password: ""` placeholder) and do the env read/validation/injection in
  `vite.config.ts` instead, which is never imported by anything in `src/jsx/`. If you ever
  need to change something build-config-related and it feels like it needs a `process.env`
  read, check first whether it's happening in a file `shared.ts` (transitively) imports.

## Open questions / risks

1. **I can't run After Effects here.** This sandbox has no AE install, so Phase 1 is
   verified by `npm run build`, `npm run typecheck`, and careful reading — not by actually
   clicking Generate in a panel. Please test against the steps in `README.md` and report
   back; I'd expect the highest-risk spot to be `getHostEnvironment()`/`appSkinInfo` theming
   (typed as `any` in Adobe's own `.d.ts`, so a shape mismatch wouldn't be caught by
   `tsc`) and the exact CSXS/debug-port version bolt-cep picks for your AE version.
2. **ffmpeg auto-detection is best-effort.** The candidate-path list is carried over from the
   prototype (winget/choco/scoop on Windows, homebrew/usr-local/usr on macOS) plus a
   `where`/`command -v` fallback. If your install lives somewhere else, "Locate ffmpeg…" in
   Settings covers it, but first-run UX for someone with no ffmpeg and a large/uncommon-format
   clip is still just an error message, not an in-panel installer.
3. **The AES-at-rest key protection is convenience, not a hard security boundary** — see
   above. Worth flagging explicitly since the master prompt is understandably strict about
   never leaking the API key.
4. **Bundling ffmpeg binaries per-platform** (master prompt: "Bundle ffmpeg binaries per
   platform, use an LGPL build and respect its license") isn't done — Phase 1 only detects a
   system install. Bundling means bringing in real per-OS/arch LGPL binaries (several tens of
   MB each) plus license-compliance paperwork, which needs a decision on hosting/repo size
   before I add it as a build step.
5. **Vocabulary prompt token counting is a word-count approximation**, not the actual
   tokenizer Groq uses server-side, so the 224-token warning in the Transcribe tab is a
   rough guardrail, not an exact one.

## Phase status

- **Phase 1 (this PR): done.** Scaffold, manifest/debug/ZXP config, typed bridge, Settings
  tab (API key + ffmpeg), audio extraction, raw transcript view in the Transcribe tab.
- **Phase 2 (next):** frame-quantized time mapping + onset refinement, caption grouping,
  `captions.json` + comp/text-layer generation with basic style, ported from
  `Groq_Captions.jsx`'s proven `mapToComp`/`applySync`/`buildGroups`/Expression-Selector code.
- **Phase 3:** live transcript editor, full style controls + presets.
- **Phase 4:** animation presets, Social/Subtitle modes, SRT/VTT/JSON export.
- **Phase 5:** caching, chunked long-audio transcription, real keychain integration, bundled
  ffmpeg, polish, ZXP signing/release packaging.
