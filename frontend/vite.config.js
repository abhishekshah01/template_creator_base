import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Allow custom host for preview environments, accept all hosts in production
const allowedHosts = process.env.VITE_ALLOWED_HOST 
  ? [process.env.VITE_ALLOWED_HOST] 
  : undefined;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    hmr: false,
    ...(allowedHosts && { allowedHosts }),
  },
})
