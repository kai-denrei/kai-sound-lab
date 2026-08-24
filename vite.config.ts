import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves from /kai-sound-lab/; local dev and preview stay at /
  base: process.env.VITE_BASE ?? "/",
  server: { port: 5178 },
  build: { target: "es2022" },
});
