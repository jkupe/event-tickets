import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/v1\/tickets\/.+\/validate/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'check-in-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@event-tickets/shared-types': path.resolve(__dirname, '../../libs/shared/types/src/index.ts'),
      '@event-tickets/shared-utils': path.resolve(__dirname, '../../libs/shared/utils/src/index.ts'),
      '@event-tickets/shared-ui': path.resolve(__dirname, '../../libs/shared/ui/src/index.ts'),
      '@event-tickets/shared-auth': path.resolve(__dirname, '../../libs/shared/auth/src/index.ts'),
      '@event-tickets/shared-api-client': path.resolve(__dirname, '../../libs/shared/api-client/src/index.ts'),
    },
  },
  server: {
    port: 3002,
  },
});
