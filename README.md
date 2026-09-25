# Groq Captions

A CEP extension for After Effects (2024+) that turns any audio in a comp into word-synced
animated captions, using Groq's hosted Whisper API for transcription.

Through **Phase 2**: project scaffold, the CEP↔ExtendScript bridge, API key settings,
ffmpeg-based audio extraction (with automatic chunking for long audio), the Groq
transcription call, frame-accurate word-sync (time mapping, quantization, onset
refinement), caption grouping, and building the actual animated caption layers into the
comp. Not yet built: the live transcript editor, full style controls/presets, animation
presets beyond the current three, and SRT/VTT/JSON export — see `docs/ARCHITECTURE.md`
for the full phase plan and current status.

## Requirements

- After Effects 2024 or newer (Windows or macOS, Intel or Apple Silicon)
- [Node.js](https://nodejs.org/) 18+ and npm, for building the panel
- [ffmpeg](https://ffmpeg.org/) on your PATH (recommended) — Windows: `winget install ffmpeg`,
  macOS: `brew install ffmpeg`. Without it, only short clips (≤25 MB, in mp3/mp4/wav/m4a/
  flac/ogg/webm) can be sent directly to Groq.
- A [Groq API key](https://console.groq.com/keys)

## Setup

```sh
npm install
```

### API key

For local development, create `.env.local` at the project root:

```
GROQ_API_KEY=gsk_your_key_here
```

`.env.local` is git-ignored and is never bundled into a packaged extension (ZXP) — a
released build only ever uses a key entered by the user in the Settings tab. A key saved in
Settings always takes priority over `.env.local`.

### Enable scripting network/file access in After Effects

Preferences (Windows: Edit ▸ Settings, macOS: After Effects ▸ Settings) ▸ Scripting &
Expressions ▸ check **"Allow Scripts to Write Files and Access Network"**.

### Enable CEP debug mode (unsigned extensions)

Required to load an unpackaged extension during development. **Which CEP version your AE
uses depends on its release**, and it's changed recently enough that you should set *both*
CSXS.11 and CSXS.12 rather than guess:

- After Effects 2022–2024 (versions up to ~24.x): **CEP 11**.
- After Effects 2025 / 2026 (versions ~25.x and newer): **CEP 12**.

`npm run dev`'s console output also prints the exact port/version bolt-cep is targeting if
you want to confirm.

- **macOS**: in Terminal, run both
  ```sh
  defaults write com.adobe.CSXS.11 PlayerDebugMode 1
  defaults write com.adobe.CSXS.12 PlayerDebugMode 1
  ```
- **Windows**: in `regedit`, create both
  `HKEY_CURRENT_USER\Software\Adobe\CSXS.11` and `HKEY_CURRENT_USER\Software\Adobe\CSXS.12`,
  and in each create a String Value named `PlayerDebugMode` set to `1`.

**Known CEP 12 bug:** on some recent AE builds (reported against AE 2026 on Windows, and
against other CC 2025 apps on macOS), CEP 12 silently ignores `PlayerDebugMode` and enforces
signature verification anyway, so the panel refuses to load even with the key set correctly.
There's no official fix yet. The workaround is to self-sign the extension instead of relying
on debug mode: `npm run zxp` (see **Build / package** below) already uses the ZXPSignCmd
binaries bundled with vite-cep-plugin to produce a self-signed `.zxp` — install that (double
-click it, or drag it onto the ZXP Installer / Anastasiy's Extension Manager) instead of using
the dev symlink if your panel won't load despite debug mode being set.

## Run in development

```sh
npm run dev
```

This starts Vite (hot-reloading the panel) and symlinks the extension into After Effects'
extensions folder. Launch or restart After Effects, then open the panel from
**Window ▸ Extensions ▸ Groq Captions**.

## How to test Phase 1

1. Open a comp with a footage or audio layer that has a voice track.
2. Select **that one layer** and open the Groq Captions panel.
3. **Settings tab**: confirm it shows "Using saved key" or "Using GROQ_API_KEY from
   .env.local"; if not, paste a key and click **Save key**, then **Test key** to confirm
   it's valid. Check the ffmpeg row shows a found path (or use **Locate ffmpeg…**).
4. **Transcribe tab**: it should show your selected layer's name, comp, and duration. Pick
   a model/language, then **Generate Transcript**.
5. What "working" looks like: the panel shows extraction/transcription progress, then a
   transcript below with the full text and a scrollable per-word table of start/end
   timestamps. **Cancel** should stop an in-flight extraction or transcription cleanly.
   Selecting nothing, multiple layers, a layer with no audio, or a precomp/solid layer
   should show a clear inline message instead of a crash.

## How to test Phase 2

Continue from Phase 1 above: generate a transcript, then a new **Captions** section
appears below it with sync, grouping, and style controls, and a **Build Captions** button.

1. **The accuracy test that actually matters**: record yourself (or find a clip) counting
   clearly with pauses — "one *(pause)* two *(pause)* three *(pause)*…" — at whatever your
   comp's frame rate is. Generate a transcript, leave the sync/style controls at their
   defaults, click **Build Captions**. Scrub through the new "Captions - `<comp name>`"
   precomp: **each number should appear on the exact frame you hear it start, or at most
   one frame off.** This is the non-negotiable requirement the whole sync pipeline (time
   mapping → onset refinement → frame quantization) exists for — test it at a few different
   frame rates if your projects use more than one (23.976/24/25/29.97/30/50/59.94/60 are
   all explicitly supported).
2. Toggle **"Refine word timing against the audio"** off and rebuild on the same clip —
   compare against the onset-refined version. Refinement should generally *tighten* the
   sync (Whisper's own timestamps are commonly 100–200ms late), not degrade it.
3. Try the **Offset** field (e.g. +2 or -2 frames) and rebuild — every word should shift by
   exactly that many frames. Try **Lead-in** (e.g. 3 frames) with "Word-by-word" checked —
   each word should now animate in slightly before it's spoken rather than exactly on it.
4. Click **Build Captions** again without changing anything (or after tweaking a style
   field like a color or the font) — it should relabel itself **Rebuild Captions**, *not*
   call Groq again (no new network activity, no "Transcribing…" status — only "Building
   captions in After Effects…"), and create a fresh "Captions - …" precomp using the
   current settings. The old one is left in the project on purpose (delete it yourself if
   you don't need it) rather than silently discarding a layer you might have been editing.
5. Check the caption layers themselves inside the new precomp: text should be wrapped to at
   most 2 lines, styled per your color/font/stroke settings, positioned per **Position**,
   and animated per whichever of Word-by-word/Highlight active/Pop in/Drop shadow you had
   checked. Undo (**Ctrl/Cmd+Z**) once should remove the *entire* build (all caption layers
   plus the precompose) in one step.
6. **Long audio / chunking**: if you have ffmpeg and a clip longer than 10 minutes, generate
   a transcript from it — the status text should show "Extracting chunk 1 of N…" /
   "Transcribing chunk 1 of N…" rather than a single pass, and the onset-refinement checkbox
   should be disabled with "(unavailable for this transcript)" next to it (there's no single
   audio file to re-analyze once it's been split). Word timing across the chunk boundary
   (around the 10-minute mark) should still look continuous, not duplicated or dropped.
7. Error handling to spot-check: cancel mid-extraction and mid-transcription (temp files
   shouldn't accumulate in your OS temp folder — check `%TEMP%`/`$TMPDIR` for stray
   `groqcap_*` files after a few cancels); try Build Captions after switching to a
   *different* comp than the one you transcribed (should show a clear "open the same
   composition…" error, not build into the wrong comp).

## Build / package

```sh
npm run build   # production build to dist/cep
npm run zxp     # signed .zxp for distribution
npm run zip     # .zip with the zxp + install instructions
```

`npm run zxp` / `npm run zip` sign the package with a self-signed certificate, whose password
comes from the `ZXP_PASSWORD` environment variable — it is **not** stored in `cep.config.ts`
(this repo is public). Export it in your shell before packaging:

```sh
export ZXP_PASSWORD="something-only-you-know"
npm run zxp
```

Without it, the build throws immediately with a clear error instead of silently signing with
a placeholder password. This is unrelated to `.env.local`/`GROQ_API_KEY` — that file is
only read at panel runtime (inside After Effects), never by these build scripts.

## Project layout

```
cep.config.ts          extension id/name/icons/panel size, build & zxp config (no secrets - see vite.config.ts)
src/jsx/aeft/aeft.ts     ExtendScript host: layer info, ffmpeg picker, and buildCaptions (comp/layer building)
src/js/main/             React panel UI (Transcribe / Edit / Style / Export / Settings tabs)
  components/CaptionBuilder.tsx   Sync/grouping/style controls + Build/Rebuild Captions (Phase 2)
src/js/lib/services/     Node-side services: ffmpeg, onset refinement, Groq API client, API key + settings storage, theme
src/js/lib/cep/          Adobe's CSInterface + CEP glue (see NOTICE.md)
src/js/lib/utils/        CEP bridge helpers (evalTS, evalES, theme events — see NOTICE.md)
src/shared/              Pure, unit-tested logic + types shared between panel and host
  sync.ts                  time mapping, frame quantization, sync
  captions.ts               caption grouping, line wrapping, reveal timing
  onset.ts                  RMS envelope + onset detection math (Node wrapper in lib/services/onset.ts)
  chunking.ts                long-audio chunk planning + stitching
  (each has a matching *.test.ts - 56 tests total)
docs/ARCHITECTURE.md    Data model, phase plan, open questions/risks
```

Run the unit tests for everything in `src/shared/` with:

```sh
npm run test
```

See `NOTICE.md` for what's original to this project versus adapted from
[bolt-cep](https://github.com/hyperbrew/bolt-cep) and Adobe's CEP SDK.
