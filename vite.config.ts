import { readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

/**
 * Creator pack audio is licensed for use, not redistribution, so it must
 * never reach a published build.
 *
 * Gitignoring it covers a build made from a clone — CI has nothing to copy.
 * It does not cover a build made here, because Vite copies all of public/
 * into dist/ and the files are really on this disk. Deleting them after the
 * copy closes that hole regardless of where the build runs, so the guarantee
 * no longer depends on remembering which machine deployed.
 *
 * The manifest is unaffected: the app probes for its audio at runtime and
 * renders link-outs to the creator when it is absent.
 */
function excludeCreatorAudio(): Plugin {
  return {
    name: "exclude-creator-audio",
    apply: "build",
    closeBundle() {
      const root = resolve(__dirname, "dist", "creators");
      let removed = 0;
      const walk = (dir: string): void => {
        let entries: string[];
        try {
          entries = readdirSync(dir);
        } catch {
          return; // nothing was copied
        }
        for (const name of entries) {
          const path = join(dir, name);
          if (statSync(path).isDirectory()) walk(path);
          else if (name.endsWith(".wav")) {
            rmSync(path);
            removed++;
          }
        }
      };
      walk(root);
      if (removed)
        this.info(`excluded ${removed} creator WAV(s) from dist — not ours to redistribute`);
    },
  };
}

export default defineConfig({
  // GitHub Pages serves from /kai-sound-lab/; local dev and preview stay at /
  base: process.env.VITE_BASE ?? "/",
  server: { port: 5178 },
  build: { target: "es2022" },
  plugins: [excludeCreatorAudio()],
});
