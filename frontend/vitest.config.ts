import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const coreCoverageInclude = [
  'src/App.tsx',
  'src/components/ProductCard.tsx',
  'src/lib/product-categories.ts',
  'src/lib/user-display.ts',
  'src/lib/utils.ts',
];

const coreCoverageExclude = [
  'src/**/*.d.ts',
  'src/**/*.test.{ts,tsx}',
  'src/**/*.spec.{ts,tsx}',
  'src/**/__tests__/**',
  'src/test/**',
  'src/assets/**',
  'src/generated/**',
  'src/main.tsx',
  'dist/**',
  'coverage/**',
  'node_modules/**',
];

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      all: true,
      reportsDirectory: './coverage',
      include: coreCoverageInclude,
      exclude: coreCoverageExclude,
      reporter: ['text', 'json-summary', 'lcov', 'html', 'cobertura'],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
