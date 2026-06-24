import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Root Vitest config. Runs the pure-logic test suites across all packages.
// The shared package is resolved from source so tests never depend on a build step.
export default defineConfig({
  resolve: {
    alias: {
      '@blendquest/shared': resolve(__dirname, 'packages/shared/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/{shared,server,client}/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/shared/src/**', 'packages/server/src/engine/**', 'packages/server/src/rooms/**'],
      exclude: ['**/*.test.ts', '**/index.ts', '**/*.d.ts'],
    },
  },
});
