import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    host: true,
    allowedHosts: [
      'localhost',
      '.replit.dev',
      'e12033d9-a74a-4618-8f9a-39fea7cbcddc-00-2d8dk41eolr3o.spock.replit.dev'
    ],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
