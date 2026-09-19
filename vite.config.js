import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // Dev proxy: forwards /api/* to Express (port 3001) so the API key stays server-side.
    // In production, Express itself handles /api/* routes and serves the React build.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
