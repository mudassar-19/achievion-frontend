import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // "@/components/ui/Button" → "src/components/ui/Button"
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    port: 5173,
    open: true,
    // Proxy API calls to a future backend
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET || "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    outDir: "dist",
    sourcemap: false, // FE-062: no source maps in production output
    // Split vendor chunks for better caching
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("react-dom") || id.includes("react/"))  return "vendor";
          if (id.includes("react-router-dom"))                     return "router";
          if (id.includes("framer-motion"))                        return "animations";
          if (id.includes("zustand"))                              return "state";
        },
      },
    },
  },
});
