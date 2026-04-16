import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '$app': resolve(__dirname, 'src/app'),
      '$routes': resolve(__dirname, 'src/routes'),
      '$components': resolve(__dirname, 'src/components'),
      '$modules': resolve(__dirname, 'src/modules'),
      '$lib': resolve(__dirname, 'src/lib'),
      '$styles': resolve(__dirname, 'src/styles'),
    },
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 30_000,
    include: ['unit_tests/**/*.test.ts', 'unit_tests/**/*.spec.ts', 'integration_tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts', 'src/**/*.svelte'],
      exclude: ['src/**/*.d.ts', 'src/**/index.ts'],
    },
  },
});
