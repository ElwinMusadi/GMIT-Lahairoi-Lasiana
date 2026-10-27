import path from 'node:path'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // cloudflare() menjalankan Worker Hono (src/worker) di runtime workerd
  // dalam dev server Vite yang sama, termasuk binding D1 lokal.
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src/client'),
      '@shared': path.resolve(import.meta.dirname, './src/shared'),
    },
  },
})
