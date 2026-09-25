# Groq Captions

> AI-powered word-synced captions for Adobe After Effects.

A CEP extension that turns spoken audio into frame-accurate, animated captions using Groq's Whisper API.

## What it does

- 🎙️ Transcribes audio directly from an After Effects composition
- ⚡ Uses Groq / Whisper for fast transcription
- 🎯 Refines word timing against the source audio
- 🎬 Builds animated caption layers inside After Effects
- 🔤 Supports word-by-word and highlight-based animation
- 🧩 Handles long audio with automatic chunking
- 🛠️ Includes development and ZXP packaging workflows

## Stack

TypeScript · React · CEP · ExtendScript · Groq API · FFmpeg · Vite · After Effects

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

The core transcription → synchronization → caption-building pipeline is implemented.

Current work is focused on expanding editing controls, presets, exports and the overall authoring experience.

## Development

~~~bash
npm install
npm run dev
npm run test
npm run build
npm run zxp
~~~

See the repository documentation for the complete setup, CEP configuration and testing workflow.

## Built by IVX

I build creative tools that connect editing, motion design, VFX and software.

[GitHub](https://github.com/64r3al) · [More projects](https://github.com/64r3al?tab=repositories)
