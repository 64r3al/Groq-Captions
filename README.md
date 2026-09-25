# Groq Captions

A CEP extension for After Effects (2024+) that turns any audio in a comp into word-synced
animated captions, using Groq's hosted Whisper API for transcription.

This is a **Phase 1** build: project scaffold, the CEP↔ExtendScript bridge, API key
settings (Settings tab), ffmpeg-based audio extraction, and a raw transcript view in the
Transcribe tab. It does **not** build caption layers into the comp yet — that starts in
Phase 2. See `docs/ARCHITECTURE.md` for the full plan and current status.

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

Required to load an unpackaged extension during development.

- **macOS**: in Terminal, run
  `defaults write com.adobe.CSXS.11 PlayerDebugMode 1`
  (bump `.11` to match your CEP version if different; bolt-cep's dev server prints which
  one it's using).
- **Windows**: in `regedit`, create/set
  `HKEY_CURRENT_USER\Software\Adobe\CSXS.11` → `PlayerDebugMode` (string) → `1`.

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

## Build / package

```sh
npm run build   # production build to dist/cep
npm run zxp     # signed .zxp for distribution (edit the zxp cert/password in cep.config.ts first)
npm run zip     # .zip with the zxp + install instructions
```

## Project layout

```
cep.config.ts        extension id/name/icons/panel size, build & zxp config
src/jsx/aeft/         ExtendScript host code (runs inside After Effects)
src/js/main/           React panel UI (Transcribe / Edit / Style / Export / Settings tabs)
src/js/lib/services/   Node-side services: ffmpeg, Groq API client, API key + settings storage, theme
src/js/lib/cep/        Adobe's CSInterface + CEP glue (see NOTICE.md)
src/js/lib/utils/      CEP bridge helpers (evalTS, evalES, theme events — see NOTICE.md)
src/shared/            Types and constants shared between panel and host
docs/ARCHITECTURE.md   Data model, phase plan, open questions/risks
```

See `NOTICE.md` for what's original to this project versus adapted from
[bolt-cep](https://github.com/hyperbrew/bolt-cep) and Adobe's CEP SDK.
