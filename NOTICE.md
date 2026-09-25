# Third-party code

This project's CEP scaffolding (build config, host/panel bridge, and CEP integration files)
is adapted from [bolt-cep](https://github.com/hyperbrew/bolt-cep) by Hyper Brew LLC, MIT
licensed — see `LICENSE`. Files carried over largely as-is:

- `vite.config.ts`, `vite.es.config.ts`, `cep.config.ts` (build/manifest generation)
- `src/js/lib/cep/*`, `src/js/lib/utils/bolt.ts`, `src/js/lib/utils/cep.ts`,
  `src/js/lib/utils/init-cep.ts`, `src/js/main/index-react.tsx`
- `src/jsx/index.ts`, `src/jsx/tsconfig.json`, `src/jsx/aeft/tsconfig.json`
- `tsconfig*.json`, `.npmrc`

Everything under `src/js/lib/services/`, `src/js/main/App.tsx` and
`src/js/main/components/`, `src/jsx/aeft/aeft.ts`, `src/shared/`, and the docs in `docs/`
is original to this project.

`src/js/lib/cep/csinterface.js`, `csinterface.d.ts`, `cep_engine_extensions.js`, `vulcan.js`,
and `vulcan.d.ts` are Adobe's own CEP SDK files (Copyright Adobe Systems Incorporated),
included under the terms in each file's header, which permit use, modification, and
distribution as part of a CEP extension.

`src/jsx/lib/json2.js` is Douglas Crockford's public-domain JSON2 polyfill, needed because
ExtendScript (ES3) has no native `JSON` object.

One deviation from the vendored bolt-cep files: `src/jsx/tsconfig.json` and
`src/jsx/aeft/tsconfig.json` use `"target": "es5"` instead of bolt-cep's `"es3"` — current
TypeScript (5.9) removed the `es3` target option entirely. This only affects `tsc`'s
type-checking; the actual ES3-safe ExtendScript output still comes from Babel
(`vite.es.config.ts`), which is unaffected.

The original `Groq_Captions.jsx` ScriptUI prototype supplied for this project was used as the
functional reference for word-level sync, caption grouping, and Expression Selector animation
logic; that logic is ported into `src/jsx/aeft/` starting in Phase 2 (see
`docs/ARCHITECTURE.md`).

`src/js/main/ui/fonts/Inter-Variable.woff2` is the [Inter](https://rsms.me/inter/) variable
typeface by The Inter Project Authors, licensed under the SIL Open Font License 1.1 (full
text in `src/js/main/ui/fonts/Inter-LICENSE.txt`) — bundled locally rather than loaded from
Google Fonts or any other network source, so the panel never depends on network access just
to render its own UI (`lucide-react`, MIT licensed, is used the same self-contained way for
icons). The actual `@font-face` rule the build uses is the base64-inlined, auto-generated
`src/js/main/ui/_inter-font-face.scss` (see that file's header comment for why it's inlined
rather than a plain `url()` asset reference) — the `.woff2` file is kept as the source of
truth/attribution copy, not referenced directly by the build.
