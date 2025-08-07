import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Suppress React DevTools warning in development
    __REACT_DEVTOOLS_GLOBAL_HOOK__: 'undefined',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    fs: {
      // Allow serving files from one level up from the project root
      allow: ['..'],
    },
    // Proxy Supabase Storage requests to avoid cookie issues on images
    proxy: {
      '/storage': {
        target: process.env.VITE_SUPABASE_URL || 'https://psqmckbtwqphcteymjil.supabase.co',
        changeOrigin: true,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        configure: (proxy, _options) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          proxy.on('proxyRes', (proxyRes, _req, _res) => {
            // Remove all set-cookie headers for storage assets
            delete proxyRes.headers['set-cookie'];
            
            // Set cache headers for images
            const url = _req.url || '';
            if (url.includes('/storage/v1/object/public/')) {
              proxyRes.headers['cache-control'] = 'public, max-age=3600';
            }
          });
          
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          proxy.on('proxyReq', (proxyReq, _req, _res) => {
            // Remove all cookies from storage requests
            proxyReq.removeHeader('cookie');
          });
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Charts library - very heavy
          charts: ['chart.js', 'react-chartjs-2'],

          // Animation library
          animations: ['framer-motion'],

          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Data fetching and state management
          'data-libs': [
            '@tanstack/react-query',
            '@tanstack/react-query-devtools',
            'zustand',
          ],

          // Backend/API libraries
          'api-libs': ['@supabase/supabase-js', 'axios'],

          // Supabase realtime (large chunk)
          supabaseRealtime: ['@supabase/realtime-js'],

          // UI/Utility libraries
          'ui-libs': [
            '@headlessui/react',
            'react-icons',
            'dayjs',
            'browser-image-compression',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1500, // Increase warning limit to 1.5MB for large dependencies

    // Optimize for better performance - updated for Vite v7
    target: ['chrome107', 'firefox104', 'safari16', 'edge107'],
    minify: 'esbuild',
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
  },
});
