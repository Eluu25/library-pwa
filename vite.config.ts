import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

declare const process: { env: Record<string, string | undefined> }

// Use '/' for Netlify and local dev, '/library-pwa/' when building on GitHub Actions
const BASE = process.env.VITE_BASE_PATH ?? (process.env.NETLIFY ? '/' : (process.env.GITHUB_ACTIONS ? '/library-pwa/' : '/'))

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: 'Liora Library',
        short_name: 'Liora',
        description: 'Liora Library - Borrow books & read digital eBooks',
        theme_color: '#0F7B6C',
        background_color: '#F7F4EC',
        display: 'standalone',
        scope: BASE,
        start_url: BASE,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
