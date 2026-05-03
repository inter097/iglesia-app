import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Cache API calls
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname === 'hub.eliuth.dev',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'iglesia-api',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
      },
      manifest: {
        name: 'Iglesia AFC',
        short_name: 'AFC',
        description: 'Cancionero Iglesia AFC',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
})
