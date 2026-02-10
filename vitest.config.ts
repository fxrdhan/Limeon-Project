import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import fs from 'fs';

const nonRuntimeCoverageFiles = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, 'scripts/coverage/non-runtime-files.json'),
    'utf8'
  )
) as string[];

export default defineConfig({
  // @ts-expect-error - Plugin type mismatch between Vite and Vitest's bundled Vite
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: [...configDefaults.exclude, 'playwright/**', 'test-results/**'],
    coverage: {
      provider: 'v8',
      all: true,
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
        'src/playwright/**',
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
});
