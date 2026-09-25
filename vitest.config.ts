import { defineConfig } from "vite";

// Deliberately separate from vite.config.ts: that one configures the CEP panel build (custom
// `root`, the vite-cep-plugin manifest/symlink generation, an ExtendScript side-build) which
// has nothing to do with running unit tests against the pure logic in src/shared/, and in
// practice breaks vitest's own dev-server bootstrapping if reused as-is.
export default defineConfig({
  test: {
    include: ["src/shared/**/*.test.ts"],
  },
});
