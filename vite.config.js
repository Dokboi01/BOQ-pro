/* global process */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VITE_API_BASE_URL?.trim()

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000, // Increase limit to 5MB
        },
        manifest: {
          name: 'Quantra - Enterprise Engineering',
          short_name: 'Quantra',
          description: 'Advanced Civil Engineering BOQ & Rate Analysis Tool',
          theme_color: '#0f172a',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    server: apiBase ? {
      proxy: {
        '/api': {
          target: apiBase,
          changeOrigin: true,
        }
      }
    } : undefined,
    build: {
      chunkSizeWarningLimit: 3000, // Increase warning limit to 3MB
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('react')) return 'vendor-react';
              return 'vendor'; // all other package dependencies
            }
            if (id.includes('src/data/')) {
              return 'engineering-data';
            }
          },
        },
      },
    },
    base: './',
  }
})
