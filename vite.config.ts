import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    assetsDir: "assets",
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name].[hash][extname]",
        chunkFileNames: "assets/[name].[hash].js",
        entryFileNames: "assets/[name].[hash].js"
      },
      external: (id) => {
        // Don't bundle Node.js built-ins
        return id.startsWith('node:') || ['fs', 'path', 'crypto', 'stream', 'util'].includes(id);
      }
    },
    target: 'esnext',
    minify: 'esbuild'
  },
  base: "/",
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
