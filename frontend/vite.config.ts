import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

const embed = process.env.RADAR_EMBED === '1'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/swagger-ui': 'http://localhost:8080',
      '/api-docs': 'http://localhost:8080',
      '/v3': 'http://localhost:8080',
    },
  },
  build: {
    outDir: embed
      ? path.resolve(__dirname, '../backend/src/main/resources/static')
      : 'dist',
    emptyOutDir: true,
  },
})
