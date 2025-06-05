import { defineConfig } from 'vite';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: resolve(__dirname, 'src'),
  publicDir: resolve(__dirname, 'src', 'public'),
  assetsInclude: ['**/*.png'],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src', 'index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'scripts',
      filename: 'sw.js',
      injectManifest: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,jpg,webp}', 'images/screenshots/*.png'
        ], 
        globIgnores: ['**/node_modules/**', '**/dist/**'],
      },
      manifest: {
        name: 'TaleWeaver - Weave Your Stories',
        short_name: 'TaleWeaver',
        description: 'A community-driven platform for sharing and discovering captivating narratives from around the globe. Weave your own tales and explore others.',
        theme_color: '#4A3B31',
        background_color: '#F8F4E3',
        display: 'standalone',
        scope: '/',
        start_url: '/?source=pwa#/',
        id: '/?source=pwa#/',
        icons: [
          {
            src: 'images/icons/favicon-16x16.png',
            sizes: '16x16',
            type: 'image/png',
          },
          {
            src: 'images/icons/favicon-32x32.png',
            sizes: '32x32',
            type: 'image/png',
          },
          {
            src: 'images/icons/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'images/icons/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallbackAllowlist: [/^\/$/],
      },
      registerType: 'autoUpdate',
    }),
  ],
  server: {}
});