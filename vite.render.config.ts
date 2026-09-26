import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Second build pass: the headless render harness (render.html).
 * Kept separate from the app build because vite-plugin-singlefile cannot
 * handle more than one HTML entry. Output is additive — `emptyOutDir: false`
 * leaves dist/index.html from the main build in place.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    emptyOutDir: false,
    outDir: "dist",
    rollupOptions: {
      input: { render: path.resolve(__dirname, "render.html") },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
