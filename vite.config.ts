import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Use relative asset URLs for packaged desktop builds so Tauri can load
// frontend files from the app bundle instead of requesting them from root.
export default defineConfig(({ command, mode }) => {
  return {
    base: command === 'build' ? './' : '/',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: mode === 'development',
    },
    server: {
      host: "::",
      port: 5173,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
