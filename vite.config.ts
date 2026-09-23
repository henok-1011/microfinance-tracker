import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { devApiPlugin } from './scripts/dev-api-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  // `devApiPlugin` is dev-only, so `npm run dev` serves `/api/**` too.
  plugins: [react(), tailwindcss(), devApiPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
