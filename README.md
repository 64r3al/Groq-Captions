# Pro Caption AE

> AI-powered, viral-ready captions for Adobe After Effects.

A professional CEP extension that transforms spoken audio into frame-accurate, animated captions with 65+ viral animation presets using Groq's Whisper API.

## What it does

- 🎙️ Transcribes audio directly from an After Effects composition with Groq Whisper
- ⚡ Zero-delay, frame-quantized caption timing for perfect sync
- 🎯 Intelligent word-timing refinement against source audio with RMS-based onset detection
- 🎬 Auto-builds animated caption layers inside After Effects with expression-based animation
- 🔤 65+ viral animation presets optimized for TikTok, YouTube, AMV, Music Videos & Storytelling
- 🌈 Live preview canvas with real-time style and animation feedback
- 🧩 Automatic audio chunking for long content, glossary support for proper noun spelling
- 🛠️ Complete development, testing, and ZXP packaging workflows

## Installation

1. Download the latest `.zxp` from [Releases](https://github.com/64r3al/Pro-Caption-AE/releases/latest).
2. Install it with the free [ZXP/UXP Installer](https://aescripts.com/learn/zxp-installer/), then restart After Effects.
3. Open **Window → Extensions → Pro Caption AE** and add your Groq API key in Settings.

Requires After Effects 2024+ and FFmpeg. See [INSTALLATION.md](./INSTALLATION.md) for details.

## Stack

TypeScript · React · CEP · ExtendScript · Groq Whisper API · FFmpeg · Vite · After Effects

## Architecture

~~~text
Audio
  ↓
FFmpeg extraction
  ↓
Groq / Whisper transcription
  ↓
Word timestamps
  ↓
Onset refinement
  ↓
Frame quantization
  ↓
Caption grouping
  ↓
After Effects layers
~~~

## Project status

The core transcription → synchronization → caption-building pipeline is implemented, and the
panel UI has been redesigned around a premium, native-feeling component system (`src/js/main/ui/`).

Current work is focused on expanding editing controls, presets, exports and the overall authoring experience.

## Development

~~~bash
npm install
npm run dev
npm run test
npm run build
npm run zxp
~~~

`npm run dev` also serves the panel UI on its own in a plain browser (no After Effects
needed): a dev-only mock host answers layer-selection and build calls with sample data, and
appending `?gallery=1` to the URL opens a gallery of every UI component for visual QA.
Neither is present in a packaged build.

See the repository documentation for the complete setup, CEP configuration and testing workflow.

## Built by IVX

I build creative tools that connect editing, motion design, VFX and software.

[GitHub](https://github.com/64r3al) · [More projects](https://github.com/64r3al?tab=repositories)
