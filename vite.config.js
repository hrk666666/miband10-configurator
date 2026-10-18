import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// relative base so the build works on GitHub Pages project sites and on file:// previews
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { host: "0.0.0.0", port: 5173 },
  build: { target: "es2020", assetsInlineLimit: 0 },
});
