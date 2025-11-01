import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // Expose to network
    fs: {
      // Allow serving files from one level up from the project root
      allow: ['..'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: id => {
          // AG-Grid components (very heavy)
          if (id.includes('ag-grid')) {
            return 'ag-grid';
          }

          // Charts library - very heavy
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
            return 'charts';
          }

          // Animation library
          if (id.includes('framer-motion')) {
            return 'animations';
          }

          // React ecosystem
          if (
            id.includes('react') ||
            id.includes('react-dom') ||
            id.includes('react-router-dom')
          ) {
            return 'react-vendor';
          }

          // Data fetching and state management
          if (id.includes('@tanstack/react-query') || id.includes('zustand')) {
            return 'data-libs';
          }

          // Backend/API libraries
          if (id.includes('@supabase/supabase-js') || id.includes('axios')) {
            return 'api-libs';
          }

          // Supabase realtime (large chunk)
          if (id.includes('@supabase/realtime-js')) {
            return 'supabaseRealtime';
          }

          // Items service and related files
          if (
            id.includes('items.service') ||
            id.includes('useItems') ||
            id.includes('item-management')
          ) {
            return 'items-feature';
          }

          // Other API services
          if (id.includes('/services/api/') || id.includes('/hooks/queries/')) {
            return 'api-services';
          }

          // UI/Utility libraries
          if (
            id.includes('@headlessui/react') ||
            id.includes('react-icons') ||
            id.includes('compressorjs') ||
            id.includes('react-spinners')
          ) {
            return 'ui-libs';
          }

          // Node modules vendor chunks
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500, // Lower limit to catch chunking issues early

    // Optimize for better performance - updated for Vite v7
    target: ['chrome107', 'firefox104', 'safari16', 'edge107'],
    minify: 'esbuild',
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
  },
});
