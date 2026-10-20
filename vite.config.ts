/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
// Base path of the site; the manifest start_url, scope and id all follow it.
import { BASE } from './app-base';

// Public build identifier (not a secret). A different value changes index.html,
// which produces a new service worker version.
const BUILD_ID = process.env.APP_BUILD_ID ?? 'local';

function buildIdMeta(): Plugin {
  return {
    name: 'app-build-id',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { name: 'app-build', content: BUILD_ID }, injectTo: 'head' },
    ],
  };
}

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    buildIdMeta(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      strategies: 'generateSW',
      manifest: {
        name: 'כפל בכיף',
        short_name: 'כפל בכיף',
        lang: 'he',
        dir: 'rtl',
        display: 'standalone',
        id: BASE,
        start_url: BASE,
        scope: BASE,
        theme_color: '#13B9F2',
        background_color: '#FFF9E7',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the three screens need offline. Fonts: woff2 only (all supported browsers use it).
        globPatterns: ['**/*.{html,js,css,webp,png,woff2,webmanifest}'],
        cacheId: 'kefel-bekef',
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        // Control the page right after the first install; never skip waiting on updates.
        clientsClaim: true,
        skipWaiting: false,
      },
      // Icons are already precached by globPatterns.
      includeManifestIcons: false,
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
