import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import webExtension from 'vite-plugin-web-extension';
import manifest from './src/manifest.js';

export default defineConfig({
  plugins: [
    preact(),
    webExtension({
      manifest: () => manifest,
      // Firefox comme cible par défaut (MV3 event page).
      browser: 'firefox',
      // Ne PAS lancer un Firefox jetable (profil vierge sans session Microsoft).
      // On charge dist/ comme module temporaire dans son propre Firefox à la place.
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
