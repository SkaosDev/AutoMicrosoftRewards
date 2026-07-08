import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import webExtension from 'vite-plugin-web-extension';
import manifest from './src/manifest.js';

export default defineConfig({
  plugins: [
    preact(),
    webExtension({
      manifest: () => manifest,
      browser: 'firefox',
      // On charge dist/ manuellement dans son propre Firefox, pas dans un profil jetable.
      disableAutoLaunch: true,
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
