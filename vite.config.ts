import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    fs: {
      // Allow serving files from one level up from the project root
      allow: [".."],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Charts library - very heavy
          charts: ["chart.js", "react-chartjs-2"],

          // Animation library
          animations: ["framer-motion"],

          // React ecosystem
          "react-vendor": ["react", "react-dom", "react-router-dom"],

          // Data fetching and state management
          "data-libs": [
            "@tanstack/react-query",
            "@tanstack/react-query-devtools",
            "zustand",
          ],

          // Backend/API libraries
          "api-libs": ["@supabase/supabase-js", "axios"],
          
          // Supabase realtime (large chunk)
          "supabaseRealtime": ["@supabase/realtime-js"],

          // UI/Utility libraries
          "ui-libs": [
            "@headlessui/react",
            "react-icons",
            "dayjs",
            "browser-image-compression",
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1500, // Increase warning limit to 1.5MB for large dependencies
    
    // Optimize for better performance
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
  },
});
