import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Brotli compression - best compression ratio for modern browsers
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024, // Only compress files > 1KB
    }),
    // Bundle analyzer - generates stats.html after build
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // Expose to network
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: id => {
          // AG-Grid - split into community and enterprise
          if (id.includes('ag-grid-community')) {
            return 'ag-grid-community';
          }
          if (id.includes('ag-grid-enterprise')) {
            return 'ag-grid-enterprise';
          }
          if (id.includes('ag-grid-react')) {
            return 'ag-grid-react';
          }

          // Charts library - lazy load separately
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
            return 'charts';
          }

          // Animation library - used across app
          if (id.includes('framer-motion')) {
            return 'animations';
          }

          // React core - keep together to avoid circular dependencies
          if (
            id.includes('react/') ||
            id.includes('react-dom/') ||
            id.includes('scheduler/')
          ) {
            return 'react-vendor';
          }

          // React Router - separate from React core
          if (id.includes('react-router')) {
            return 'router';
          }

          // React Query + DevTools
          if (id.includes('@tanstack/react-query-devtools')) {
            return 'react-query-devtools'; // Only in dev
          }
          if (id.includes('@tanstack/react-query')) {
            return 'data-libs';
          }
          if (id.includes('zustand')) {
            return 'data-libs';
          }

          // Supabase - split to avoid large chunks
          if (id.includes('@supabase/realtime-js')) {
            return 'supabase-realtime';
          }
          if (id.includes('@supabase/supabase-js')) {
            return 'supabase-client';
          }

          // API utilities
          if (id.includes('axios')) {
            return 'api-libs';
          }

          // UI libraries - can be lazy loaded
          if (
            id.includes('@headlessui/react') ||
            id.includes('react-hot-toast') ||
            id.includes('react-spinners')
          ) {
            return 'ui-libs';
          }

          // Icons - separate chunk (can be large)
          if (id.includes('react-icons') || id.includes('@heroicons/react')) {
            return 'icons';
          }

          // Image processing - only used in specific features
          if (id.includes('compressorjs')) {
            return 'image-libs';
          }

          // Search utilities
          if (id.includes('fuzzysort')) {
            return 'search-libs';
          }

          // Google APIs - only used in specific features
          if (id.includes('google-auth-library') || id.includes('googleapis')) {
            return 'google-apis';
          }

          // Utility libraries
          if (
            id.includes('clsx') ||
            id.includes('classnames') ||
            id.includes('tailwind-merge')
          ) {
            return 'utils';
          }

          // Validation libraries
          if (id.includes('zod')) {
            return 'validation';
          }

          // Feature modules - keep together to avoid circular deps
          if (id.includes('/features/item-management/')) {
            return 'items-feature';
          }

          // Shared features
          if (id.includes('/features/shared/')) {
            return 'shared-features';
          }

          // API services and hooks - keep together with related components
          if (id.includes('/services/api/')) {
            return 'api-services';
          }

          // Catch-all for other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increased slightly - some chunks need to be larger

    // Optimize for better performance
    target: ['chrome107', 'firefox104', 'safari16', 'edge107'],
    minify: 'esbuild',
    sourcemap: false, // Disable sourcemaps in production
    cssCodeSplit: true, // Split CSS by route
  },
});
