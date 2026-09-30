import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5174 },
  preview: { port: 4174 },
  // three.js alone is ~500 kB minified; that is expected for this demo.
  build: { chunkSizeWarningLimit: 800 },
});
