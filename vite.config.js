import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the build works on Vercel, Netlify and GitHub Pages sub-paths alike.
  base: "./",
  build: {
    // The main chunk is ~500 kB, almost all React, Motion and DialKit. The Documentation
    // view is already split out; this just keeps Vite from warning about the rest.
    chunkSizeWarningLimit: 600,
  },
});
