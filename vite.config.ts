import fs from 'fs';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite-plus';
import { configDefaults } from 'vite-plus/test/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nonRuntimeCoverageFiles = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, 'scripts/coverage/non-runtime-files.json'),
    'utf8'
  )
) as string[];
const isAIAgent = Boolean(process.env.AI_AGENT);
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
const reporters = isAIAgent
  ? isGitHubActions
    ? ['agent', 'github-actions']
    : ['agent']
  : undefined;
const isAnalyze = process.env.ANALYZE === 'true';
const deferredInitialHtmlPreloadPatterns = [
  /^assets\/ag-grid-.*\.js$/,
  /^assets\/items-feature-.*\.(js|css)$/,
  /^assets\/auth-api-.*\.js$/,
  /^assets\/authService-.*\.js$/,
  /^assets\/api-services-.*\.js$/,
  /^assets\/supabase-core-.*\.js$/,
  /^assets\/supabaseRealtimeAuth-.*\.js$/,
];

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...(isAnalyze
      ? [
          // Bundle analyzer - generates stats.html after build
          visualizer({
            filename: 'dist/stats.html',
            open: false,
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@services': path.resolve(__dirname, './src/services'),
      '@store': path.resolve(__dirname, './src/store'),
      '@types': path.resolve(__dirname, './src/types'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    host: true, // Expose to network
  },
  test: {
    ...(reporters ? { reporters } : {}),
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: [...configDefaults.exclude, 'test-results/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'src/test/**',
        'src/schemas/generated/**',
        'src/**/__tests__/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        'dist/',
        ...nonRuntimeCoverageFiles,
      ],
      thresholds: {
        lines: 15,
        functions: 12,
        branches: 9,
        statements: 15,
      },
    },
  },
  lint: {
    ignorePatterns: ['dist/**', 'build/**', 'coverage/**', 'src/output.css'],
  },
  fmt: {
    semi: true,
    trailingComma: 'es5',
    singleQuote: true,
    printWidth: 80,
    tabWidth: 2,
    useTabs: false,
    bracketSpacing: true,
    bracketSameLine: false,
    arrowParens: 'avoid',
    endOfLine: 'lf',
    sortPackageJson: false,
    ignorePatterns: [
      'node_modules/',
      '.yarn/',
      'dist/',
      'build/',
      '.next/',
      'out/',
      '*.min.js',
      '*.min.css',
      'src/output.css',
      '.git/',
      '.env',
      '.env.local',
      '.env.development.local',
      '.env.test.local',
      '.env.production.local',
      'bun.lock',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'supabase/',
      '.DS_Store',
      '*.log',
      '*.cache',
    ],
  },
  build: {
    modulePreload: {
      resolveDependencies: (_filename, deps, context) => {
        if (context.hostType !== 'html') {
          return deps;
        }

        return deps.filter(
          dep =>
            !deferredInitialHtmlPreloadPatterns.some(pattern =>
              pattern.test(dep)
            )
        );
      },
    },
    rollupOptions: {
      output: {
        manualChunks: id => {
          // React core - keep together to avoid circular dependencies
          if (
            id.includes('react/') ||
            id.includes('react/jsx-runtime') ||
            id.includes('react/jsx-dev-runtime') ||
            id.includes('react-dom/') ||
            id.includes('scheduler/')
          ) {
            return 'react-vendor';
          }

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

          // React Router - separate from React core
          if (id.includes('react-router')) {
            return 'router';
          }

          // React Query + DevTools
          if (id.includes('@tanstack/react-query-devtools')) {
            return 'react-query-devtools'; // Only in dev
          }
          if (
            id.includes('@tanstack/react-query') ||
            id.includes('@tanstack/query-core')
          ) {
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

          if (
            id.includes('/lib/supabase.ts') ||
            id.includes('/lib/supabaseRealtimeAuth.ts') ||
            id.includes('/node_modules/@supabase/')
          ) {
            return 'supabase-core';
          }

          // Auth bootstrap needs a much smaller startup chunk than the full API layer
          if (
            id.includes('/lib/authSupabase.ts') ||
            id.includes('/services/authService.ts') ||
            id.includes('/services/api/auth.service.ts')
          ) {
            return 'auth-api';
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
    chunkSizeWarningLimit: 1000, // Keep warning for unusually large chunks only

    // Optimize for better performance
    target: ['chrome107', 'firefox104', 'safari16', 'edge107'],
    sourcemap: false, // Disable sourcemaps in production
    cssCodeSplit: true, // Split CSS by route
  },
});
