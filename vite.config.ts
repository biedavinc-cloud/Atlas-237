import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Stamps public/sw.js with a unique build id once it is copied to dist/, so
 * every deploy gets fresh caches and the previous ones are deleted when the
 * new service worker activates.
 */
function serviceWorkerBuildId(): Plugin {
  let outDir = 'dist';
  return {
    name: 'atlas-sw-build-id',
    apply: 'build',
    configResolved(config) { outDir = config.build.outDir; },
    closeBundle() {
      const file = resolve(outDir, 'sw.js');
      if (!existsSync(file)) return;
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      writeFileSync(file, readFileSync(file, 'utf8').replace(/__BUILD_ID__/g, id));
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), serviceWorkerBuildId()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'icons': ['lucide-react'],
          'data-parsers': ['papaparse', 'xlsx'],
        },
      },
    },
  },
});
