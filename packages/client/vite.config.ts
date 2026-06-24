import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Shared package is resolved from source for instant HMR across the workspace.
export default defineConfig({
  resolve: {
    alias: {
      '@blendquest/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    // Phaser is a known ~1.5 MB vendor lib, isolated into its own cacheable chunk below.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Split the heavy, rarely-changing libraries into their own chunks so the
        // browser caches them across app deploys and the app chunk stays small —
        // helps the <3s first-load budget (F17). Phaser is ~1.2 MB on its own.
        manualChunks: {
          phaser: ['phaser'],
          net: ['socket.io-client'],
        },
      },
    },
  },
});
