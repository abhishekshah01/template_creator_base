import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['.emergentcf.dev', '.emergentagent.com', 'localhost'],
    proxy: {
      '/api': 'http://localhost:8001',
    },
  },
})
